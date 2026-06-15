import { AuditAction, DocumentStatus, FileVisibility, Prisma, RealEstateDocumentType } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { enqueueDocumentGeneration } from "../jobs";
import { generatedDocumentStorageKey, getObjectResilient, putGeneratedObject } from "../storage";
import { createGeneratedFileAsset } from "./files";
import { buildGeneratedDocumentPdf, buildGeneratedDocumentPdfFromHtml } from "./document-pdf";
import { createNotification } from "./notifications";
import { ambeyAllotmentTemplate, registryStatusLetterTemplate, transferLetterTemplate } from "./letter-templates";
import { templateFields } from "./document-templates";
import { buildPdfFromExactTemplate, type PdfTemplateField } from "./pdf-template-render";

export const generateDocumentSchema = z.object({
  templateId: z.string().optional(),
  type: z.string().min(2),
  recordType: z.string().min(2),
  recordId: z.string().min(1),
  data: z.record(z.unknown()).default({}),
});

export const createDocumentDraftSchema = z.object({
  templateId: z.string().optional(),
  type: z.enum(["allotment_letter", "transfer_letter", "registry_status_letter"]),
  recordType: z.literal("Plot"),
  recordId: z.string().min(1),
});

export const updateDocumentDraftSchema = z.object({
  editableHtml: z.string().min(20),
  exactPdfValues: z.record(z.string()).optional(),
});

export async function generateDocument(context: RequestContext, input: z.infer<typeof generateDocumentSchema>) {
  const count = await prisma.generatedDocument.count({ where: { tenantId: context.tenantId, type: input.type } });
  const document = await prisma.generatedDocument.create({
    data: {
      tenantId: context.tenantId,
      templateId: input.templateId,
      type: input.type,
      recordType: input.recordType,
      recordId: input.recordId,
      data: input.data as Prisma.InputJsonValue,
      status: DocumentStatus.GENERATED,
      number: `${input.type.toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
      createdById: context.userId,
    },
  });
  const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
  const pdf = await buildGeneratedDocumentPdf({
    title: input.type.replaceAll("_", " ").toUpperCase(),
    number: document.number,
    tenantName: tenant?.name ?? "WIDESTATE OS",
    body: [
      `Generated from live ${input.recordType} record ${input.recordId}.`,
      ...Object.entries(input.data).map(([key, value]) => `${key}: ${String(value)}`),
      "Review and approve this document before issuing it to the owner or external party.",
    ],
  });
  const key = generatedDocumentStorageKey(context.tenantId, document.id);
  const stored = await putGeneratedObject(key, pdf, "application/pdf");
  const file = await createGeneratedFileAsset(context, {
    storageKey: stored.storageKey,
    storageProvider: stored.storageProvider,
    fallbackStorageKey: stored.fallbackStorageKey,
    fileName: `${document.number ?? document.id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: pdf.length,
    visibility: FileVisibility.OWNER_VISIBLE,
    documentType: input.type.toLowerCase().includes("transfer") ? "TRANSFER_LETTER" : "ALLOTMENT_LETTER",
    ownerType: input.recordType,
    ownerId: input.recordId,
  });
  const readyDocument = await prisma.generatedDocument.update({
    where: { id: document.id },
    data: { fileAssetId: file.id, status: DocumentStatus.GENERATED },
  });
  const queue = await enqueueDocumentGeneration({ documentId: document.id, tenantId: context.tenantId });
  await createNotification(context, {
    title: "Document generated",
    body: `${readyDocument.number ?? readyDocument.type} is ready to review and download.`,
    data: { documentId: readyDocument.id, fileAssetId: file.id },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "GeneratedDocument", entityId: document.id, after: document });
  return { document: readyDocument, file, queue, storage: stored };
}

export async function createDocumentDraft(context: RequestContext, input: z.infer<typeof createDocumentDraftSchema>) {
  const count = await prisma.generatedDocument.count({ where: { tenantId: context.tenantId, type: input.type } });
  const documentNumber = `${input.type.toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const snapshot = await buildPlotDocumentSnapshot(context, input.recordId);
  snapshot.variables["document.number"] = documentNumber;
  snapshot.variables["document.date"] = new Date().toLocaleDateString("en-IN");
  const selectedTemplate = input.templateId
    ? await prisma.documentTemplate.findFirst({ where: { id: input.templateId, tenantId: context.tenantId, active: true } })
    : null;
  const template = selectedTemplate
    ?? await prisma.documentTemplate.findFirst({ where: { tenantId: context.tenantId, projectId: snapshot.projectId, type: input.type, active: true }, orderBy: { createdAt: "desc" } })
    ?? await prisma.documentTemplate.findFirst({ where: { tenantId: context.tenantId, projectId: null, type: input.type, active: true }, orderBy: { createdAt: "desc" } });
  const configuredFields = templateFields(template?.variables);
  for (const field of configuredFields) {
    const fallback = field.sourceText ?? field.label ?? "";
    snapshot.variables[`field.${field.id}`] = field.mapping
      ? snapshot.variables[field.mapping] || fallback
      : snapshot.variables[`manual.${field.key}`] || fallback;
  }
  const templateSourceFileId = sourceFileIdOfTemplate(template);
  const exactPdfTemplate = templateSourceFileId && configuredFields.some((field) => field.rects?.length)
    ? {
        sourceFileId: templateSourceFileId,
        fields: configuredFields,
      }
    : null;
  const templateBody = template?.body ?? defaultTemplate(input.type);
  const { html, missingVariables } = exactPdfTemplate
    ? { html: exactPdfDraftHtml(template?.name ?? input.type), missingVariables: missingFieldVariables(configuredFields, snapshot.variables) }
    : renderTemplate(templateBody, snapshot.variables);

  let document = await prisma.generatedDocument.create({
    data: {
      tenantId: context.tenantId,
      templateId: template?.id,
      type: input.type,
      recordType: input.recordType,
      recordId: input.recordId,
      data: {
        ...snapshot,
        templateBody,
        exactPdfTemplate,
        missingVariables,
      } as Prisma.InputJsonValue,
      editableHtml: html,
      status: DocumentStatus.DRAFT,
      number: documentNumber,
      createdById: context.userId,
    },
  });

  if (exactPdfTemplate) {
    const rendered = await renderExactPdfTemplateForDocument(context, document.id, exactPdfTemplate, snapshot.variables, DocumentStatus.DRAFT);
    document = rendered.document;
  }

  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "GeneratedDocument", entityId: document.id, after: document as unknown as Prisma.InputJsonValue });
  return { document, missingVariables };
}

export async function updateDocumentDraft(context: RequestContext, id: string, input: z.infer<typeof updateDocumentDraftSchema>) {
  const before = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  const beforeData = jsonRecord(before.data);
  const document = await prisma.generatedDocument.update({
    where: { id },
    data: {
      editableHtml: input.editableHtml,
      data: input.exactPdfValues
        ? {
            ...beforeData,
            exactPdfValues: input.exactPdfValues,
          } as Prisma.InputJsonValue
        : undefined,
      status: before.status === DocumentStatus.REJECTED ? DocumentStatus.DRAFT : before.status,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "GeneratedDocument",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: document as unknown as Prisma.InputJsonValue,
  });
  return document;
}

export async function renderDocumentDraft(context: RequestContext, id: string) {
  const document = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
  const exactPdfTemplate = exactPdfTemplateFromData(document.data);
  if (exactPdfTemplate) {
    const data = jsonRecord(document.data);
    const variables = jsonRecord(data.variables);
    const exactPdfValues = jsonRecord(data.exactPdfValues);
    const mergedVariables = {
      ...Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, String(value ?? "")])),
      ...Object.fromEntries(Object.entries(exactPdfValues).map(([key, value]) => [key, String(value ?? "")])),
    };
    return renderExactPdfTemplateForDocument(
      context,
      document.id,
      exactPdfTemplate,
      mergedVariables,
    );
  }
  const html = document.editableHtml ?? "";
  const pdf = await buildGeneratedDocumentPdfFromHtml({
    title: document.type.replaceAll("_", " ").toUpperCase(),
    number: document.number,
    tenantName: tenant?.name ?? "WIDESTATE OS",
    html,
  });
  const key = generatedDocumentStorageKey(context.tenantId, document.id);
  const stored = await putGeneratedObject(key, pdf, "application/pdf");
  const file = await createGeneratedFileAsset(context, {
    storageKey: stored.storageKey,
    storageProvider: stored.storageProvider,
    fallbackStorageKey: stored.fallbackStorageKey,
    fileName: `${document.number ?? document.id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: pdf.length,
    visibility: FileVisibility.OWNER_VISIBLE,
    documentType: documentTypeForLetter(document.type),
    ownerType: document.recordType,
    ownerId: document.recordId,
  });
  const rendered = await prisma.generatedDocument.update({
    where: { id },
    data: {
      fileAssetId: file.id,
      status: DocumentStatus.GENERATED,
      finalizedAt: new Date(),
    },
  });
  await createNotification(context, {
    title: "Letter PDF ready",
    body: `${rendered.number ?? rendered.type} is ready to review.`,
    data: { documentId: rendered.id, fileAssetId: file.id },
  });
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "GeneratedDocument", entityId: id, after: rendered as unknown as Prisma.InputJsonValue });
  return { document: rendered, file, storage: stored };
}

export const approveDocumentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "ISSUED"]),
  notes: z.string().optional(),
});

export async function approveDocument(context: RequestContext, id: string, input: z.infer<typeof approveDocumentSchema>) {
  const document = await prisma.generatedDocument.update({
    where: { id, tenantId: context.tenantId },
    data: {
      status: input.status,
      approvedById: context.userId,
      approvedAt: input.status === "APPROVED" || input.status === "ISSUED" ? new Date() : undefined,
    },
  });
  await writeAuditEvent(context, { action: input.status === "APPROVED" ? AuditAction.APPROVE : AuditAction.REJECT, entityType: "GeneratedDocument", entityId: id, after: { ...document, notes: input.notes } });
  await createNotification(context, {
    title: `Document ${input.status.toLowerCase()}`,
    body: `${document.number ?? document.type} was marked ${input.status}.`,
    data: { documentId: id, status: input.status },
  });
  return document;
}

export async function getDocumentDownload(context: RequestContext, id: string) {
  const document = await prisma.generatedDocument.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });
  if (context.role === "PLOT_OWNER") {
    if (document.recordType !== "Plot") throwForbidden("Document is not visible to this owner");
    if (document.status !== "APPROVED" && document.status !== "ISSUED") throwForbidden("Document is not approved for owner download");
    const user = await prisma.user.findUnique({ where: { id: context.userId } });
    const owner = await prisma.owner.findFirst({
      where: {
        tenantId: context.tenantId,
        OR: [
          user?.email ? { email: user.email } : undefined,
          user?.phone ? { phone: user.phone } : undefined,
        ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
      },
    });
    const plot = owner
      ? await prisma.plot.findFirst({
          where: { id: document.recordId, tenantId: context.tenantId, currentOwnerId: owner.id, ownerVisible: true, archivedAt: null },
          select: { id: true },
        })
      : null;
    if (!plot) throwForbidden("Document does not belong to this owner");
  }
  return document;
}

function throwForbidden(message: string): never {
  const error = new Error(message);
  error.name = "ForbiddenError";
  throw error;
}

async function buildPlotDocumentSnapshot(context: RequestContext, plotId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: context.tenantId } });
  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    include: {
      project: true,
      currentOwner: true,
      ownershipRecords: { include: { owner: true }, orderBy: { effectiveAt: "desc" }, take: 1 },
      registryRecords: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const ownership = plot.ownershipRecords[0];
  const registry = plot.registryRecords[0];
  const ownerKyc = jsonRecord(plot.currentOwner?.kyc);
  const fatherName = stringFromKyc(ownerKyc, ["fatherName", "father", "relationName"]);
  const aadhaarNo = stringFromKyc(ownerKyc, ["aadhaarNo", "aadharNo", "aadhaar", "aadhar"]);
  const panNo = stringFromKyc(ownerKyc, ["panNo", "pan"]);
  const ownerNameWithRelation = [plot.currentOwner?.name ?? "", fatherName ? `s/o ${fatherName}` : ""].filter(Boolean).join(" ");
  const ownerAddress = plot.currentOwner?.address ?? "";
  const areaSqft = plot.areaSqft ? Number(plot.areaSqft) : null;
  const areaSqyd = areaSqft ? areaSqft / 9 : null;
  const priceInr = ownership?.amountInr ? Number(ownership.amountInr) : plot.priceInr ? Number(plot.priceInr) : null;
  const bspRate = areaSqyd && priceInr ? Math.round(priceInr / areaSqyd) : null;
  const effectiveAt = ownership?.effectiveAt ?? new Date();
  const firmName = tenant.name;
  const firmNameUpper = firmName.toUpperCase();
  const projectName = plot.project.name;
  const projectAddress = plot.project.address ?? [plot.project.city].filter(Boolean).join(", ");
  const boundaries = jsonRecord(plot.boundaries);
  const extraDetails = jsonRecord(ownership?.extraDetails);
  const pricing = jsonRecord(extraDetails.pricing);
  const payments = Array.isArray(extraDetails.payments) ? extraDetails.payments.map(jsonRecord) : [];
  const customLetterFields = jsonRecord(extraDetails.customLetterFields);
  const variables: Record<string, string> = {
    "tenant.name": tenant.name,
    "tenant.address": tenant.region ?? "",
    "tenant.gstin": tenant.gstin ?? "",
    "tenant.pan": tenant.pan ?? "",
    "tenant.contactEmail": tenant.contactEmail ?? "",
    "tenant.contactPhone": tenant.contactPhone ?? "",
    "firm.name": firmName,
    "firm.nameUpper": firmNameUpper,
    "firm.address": tenant.region ?? projectAddress,
    "firm.paymentName": firmNameUpper,
    "firm.signatory.name": stringFromKyc(jsonRecord(tenant.letterhead), ["signatoryName"]) || "Authorized Signatory",
    "firm.signatory.relation": stringFromKyc(jsonRecord(tenant.letterhead), ["signatoryRelation"]) || "",
    "firm.signatory.authorizationDate": stringFromKyc(jsonRecord(tenant.letterhead), ["authorizationDate"]) || "",
    "firm.partnerDescription": stringFromKyc(jsonRecord(tenant.letterhead), ["partnerDescription"]) || "",
    "project.name": plot.project.name,
    "project.nameUpper": projectName.toUpperCase(),
    "project.city": plot.project.city,
    "project.address": plot.project.address ?? "",
    "project.fullAddress": projectAddress,
    "project.approvalAuthority": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["approvalAuthority"]) || "Competent Authority cum Deputy Director, Local Body Government, Patiala under PAPRA Act 1995",
    "project.revenueEstate": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["revenueEstate"]) || "",
    "project.developedLandDescription": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["developedLandDescription"]) || "",
    "plot.code": plot.code,
    "plot.areaSqft": plot.areaSqft?.toString() ?? "",
    "plot.areaSqyd": areaSqyd ? formatNumber(areaSqyd) : "",
    "plot.areaSqydApprox": areaSqyd ? `${formatNumber(areaSqyd)} Sq. Yds. approx.` : "",
    "plot.priceInr": plot.priceInr?.toString() ?? "",
    "plot.priceInrFormatted": priceInr ? formatIndianAmount(priceInr) : "",
    "plot.priceInrWords": priceInr ? numberToIndianWords(priceInr) : "",
    "plot.bspRate": bspRate ? formatIndianAmount(bspRate) : "",
    "plot.facing": plot.facing ?? "",
    "plot.dimensions": plot.dimensions ?? "",
    "plot.primeLocation": plot.primeLocation ?? "",
    "plot.northBoundary": stringFromKyc(boundaries, ["north"]),
    "plot.southBoundary": stringFromKyc(boundaries, ["south"]),
    "plot.eastBoundary": stringFromKyc(boundaries, ["east"]),
    "plot.westBoundary": stringFromKyc(boundaries, ["west"]),
    "plot.eastSize": "",
    "plot.eastAdjoining": "",
    "plot.westSize": "",
    "plot.westAdjoining": "",
    "plot.northSize": "",
    "plot.northAdjoining": "",
    "plot.southSize": "",
    "plot.southAdjoining": "",
    "owner.name": plot.currentOwner?.name ?? "",
    "owner.nameUpper": plot.currentOwner?.name?.toUpperCase() ?? "",
    "owner.nameWithRelation": ownerNameWithRelation,
    "owner.nameWithRelationUpper": ownerNameWithRelation.toUpperCase(),
    "owner.fatherName": fatherName,
    "owner.phone": plot.currentOwner?.phone ?? "",
    "owner.mobileNo": plot.currentOwner?.phone ?? "",
    "owner.email": plot.currentOwner?.email ?? "",
    "owner.address": ownerAddress,
    "owner.addressUpper": ownerAddress.toUpperCase(),
    "owner.aadhaarNo": aadhaarNo,
    "owner.panNo": panNo,
    "ownership.amountInr": ownership?.amountInr?.toString() ?? "",
    "ownership.effectiveDate": ownership?.effectiveAt.toLocaleDateString("en-IN") ?? "",
    "ownership.effectiveDateDots": formatDateDots(effectiveAt),
    "ownership.effectiveDayOrdinal": ordinal(effectiveAt.getDate()),
    "ownership.effectiveMonth": effectiveAt.toLocaleString("en-IN", { month: "long" }),
    "ownership.effectiveYear": String(effectiveAt.getFullYear()),
    "ownership.sharePct": ownership?.sharePct?.toString() ?? "100",
    "payment.perUnitPrice": pricing.perUnitPrice ? String(pricing.perUnitPrice) : "",
    "payment.modes": payments.map((payment) => String(payment.mode ?? "")).filter(Boolean).join(", "),
    "payment.entries": payments.map((payment) => [payment.mode, payment.amount ? `INR ${payment.amount}` : "", payment.reference].filter(Boolean).join(" - ")).join("; "),
    "extra.eStampNumber": stringFromKyc(extraDetails, ["eStampNumber"]),
    "extra.witnessDetails": stringFromKyc(extraDetails, ["witnessDetails"]),
    "registry.status": registry?.status ?? "Not started",
    "registry.number": registry?.registryNo ?? "",
    "registry.date": registry?.registryDate?.toLocaleDateString("en-IN") ?? "",
    "today": new Date().toLocaleDateString("en-IN"),
    "todayDots": formatDateDots(new Date()),
    "rera.number": "",
    "stamp.amount": "50/-",
    "stamp.estampNo": "",
    "stamp.date": formatDateDots(new Date()),
    "possession.date": "",
    "agreement.place": plot.project.city || "Barnala",
    "witness.place": plot.project.city || "Barnala",
  };
  for (const [key, value] of Object.entries(customLetterFields)) variables[`manual.${key}`] = typeof value === "string" ? value : String(value ?? "");

  return {
    variables,
    plotId: plot.id,
    projectId: plot.projectId,
    ownerId: plot.currentOwnerId,
    ownershipRecordId: ownership?.id ?? null,
    registryRecordId: registry?.id ?? null,
  };
}

function renderTemplate(template: string, variables: Record<string, string>) {
  const missingVariables: string[] = [];
  const replaceVariable = (_match: string, key: string) => {
    const value = variables[key] ?? "";
    if (!value) missingVariables.push(key);
    const escaped = escapeHtml(value);
    return key.startsWith("field.")
      ? `<mark data-template-field="${escapeHtml(key.slice("field.".length))}" class="letter-auto-field">${escaped}</mark>`
      : escaped;
  };
  const fieldMarkerPattern = /<mark\b[^>]*data-template-field=["']([^"']+)["'][^>]*>\s*\{\{\s*field\.\1\s*\}\}\s*<\/mark>/gi;
  const html = template
    .replace(fieldMarkerPattern, (_match, id: string) => replaceVariable(_match, `field.${id}`))
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, replaceVariable);
  return { html, missingVariables: [...new Set(missingVariables)] };
}

async function renderExactPdfTemplateForDocument(
  context: RequestContext,
  documentId: string,
  template: { sourceFileId: string; fields: PdfTemplateField[] },
  variables: Record<string, string>,
  status: DocumentStatus = DocumentStatus.GENERATED,
) {
  const source = await prisma.fileAsset.findFirstOrThrow({
    where: { id: template.sourceFileId, tenantId: context.tenantId, deletedAt: null },
  });
  const sourceBytes = await getObjectResilient(source.storageKey);
  const pdf = await buildPdfFromExactTemplate({
    bytes: sourceBytes,
    fields: template.fields,
    values: variables,
  });
  const key = generatedDocumentStorageKey(context.tenantId, documentId);
  const stored = await putGeneratedObject(key, pdf, "application/pdf");
  const current = await prisma.generatedDocument.findUniqueOrThrow({ where: { id: documentId } });
  const file = await createGeneratedFileAsset(context, {
    storageKey: stored.storageKey,
    storageProvider: stored.storageProvider,
    fallbackStorageKey: stored.fallbackStorageKey,
    fileName: `${current.number ?? documentId}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: pdf.length,
    visibility: FileVisibility.OWNER_VISIBLE,
    documentType: documentTypeForLetter(current.type),
    ownerType: current.recordType,
    ownerId: current.recordId,
  });
  const document = await prisma.generatedDocument.update({
    where: { id: documentId },
    data: {
      fileAssetId: file.id,
      status,
      finalizedAt: status === DocumentStatus.GENERATED ? new Date() : null,
    },
  });
  return { document, file, storage: stored };
}

function exactPdfDraftHtml(templateName: string) {
  return `<div data-exact-pdf-draft="true"><p><strong>${escapeHtml(templateName)}</strong></p><p>This draft uses the uploaded PDF exactly. Field replacements are rendered directly on the original PDF pages.</p></div>`;
}

function exactPdfTemplateFromData(value: Prisma.JsonValue) {
  const data = jsonRecord(value);
  const raw = jsonRecord(data.exactPdfTemplate);
  const sourceFileId = typeof raw.sourceFileId === "string" ? raw.sourceFileId : "";
  const fields = Array.isArray(raw.fields) ? raw.fields.flatMap((item): PdfTemplateField[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const field = item as Record<string, unknown>;
    const id = typeof field.id === "string" ? field.id : "";
    if (!id) return [];
    return [{
      id,
      label: typeof field.label === "string" ? field.label : id,
      sourceText: typeof field.sourceText === "string" ? field.sourceText : undefined,
      mapping: typeof field.mapping === "string" ? field.mapping : null,
      rects: Array.isArray(field.rects)
        ? field.rects.flatMap((rect): NonNullable<PdfTemplateField["rects"]> => {
            if (!rect || typeof rect !== "object" || Array.isArray(rect)) return [];
            const value = rect as Record<string, unknown>;
            return typeof value.pageNumber === "number"
              && typeof value.x === "number"
              && typeof value.y === "number"
              && typeof value.width === "number"
              && typeof value.height === "number"
              ? [{ pageNumber: value.pageNumber, x: value.x, y: value.y, width: value.width, height: value.height }]
              : [];
          })
        : [],
    }];
  }) : [];
  return sourceFileId && fields.length ? { sourceFileId, fields } : null;
}

function missingFieldVariables(fields: PdfTemplateField[], variables: Record<string, string>) {
  return fields
    .map((field) => `field.${field.id}`)
    .filter((key) => !variables[key]);
}

function sourceFileIdOfTemplate(template: unknown) {
  return template && typeof template === "object" && !Array.isArray(template) && typeof (template as { sourceFileId?: unknown }).sourceFileId === "string"
    ? (template as { sourceFileId: string }).sourceFileId
    : null;
}

function defaultTemplate(type: string) {
  if (type === "transfer_letter") {
    return transferLetterTemplate();
  }
  if (type === "registry_status_letter") {
    return registryStatusLetterTemplate();
  }
  return ambeyAllotmentTemplate();
}

function documentTypeForLetter(type: string): RealEstateDocumentType {
  if (type.toLowerCase().includes("transfer")) return RealEstateDocumentType.TRANSFER_LETTER;
  if (type.toLowerCase().includes("registry")) return RealEstateDocumentType.OTHER;
  return RealEstateDocumentType.ALLOTMENT_LETTER;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringFromKyc(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function formatIndianAmount(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function formatDateDots(date: Date) {
  return date.toLocaleDateString("en-GB").replaceAll("/", ".");
}

function ordinal(day: number) {
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix}`;
}

function numberToIndianWords(input: number) {
  const value = Math.round(input);
  if (!value) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const belowHundred = (n: number) => n < 20 ? ones[n] : [tens[Math.floor(n / 10)], ones[n % 10]].filter(Boolean).join(" ");
  const belowThousand = (n: number) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return [hundred ? `${ones[hundred]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
  };
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  return [
    crore ? `${belowThousand(crore)} Crore` : "",
    lakh ? `${belowThousand(lakh)} Lac` : "",
    thousand ? `${belowThousand(thousand)} Thousand` : "",
    rest ? belowThousand(rest) : "",
  ].filter(Boolean).join(" ");
}
