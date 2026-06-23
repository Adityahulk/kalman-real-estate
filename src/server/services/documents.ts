import { AuditAction, DocumentStatus, FileVisibility, GeneratedDocument, OwnershipKind, PlotStatus, Prisma, RealEstateDocumentType } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { enqueueDocumentGeneration } from "../jobs";
import { getObjectResilient } from "../storage";
import { generatedDocumentStorageKey, putGeneratedObject } from "../storage";
import { createGeneratedFileAsset } from "./files";
import { buildGeneratedDocumentPdf, buildGeneratedDocumentPdfFromHtml } from "./document-pdf";
import { createNotification } from "./notifications";
import { defaultLetterBody, ensureProjectLetterTemplates } from "./document-templates";

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
  data: z.record(z.unknown()).default({}),
});

export const updateDocumentDraftSchema = z.object({
  editableHtml: z.string().min(20),
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
  const fallbackNumber = `${input.type.toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  // A user-supplied number (e.g. TBS/AH/2026/006 from the allotment form) is used verbatim.
  const providedNumber = typeof input.data.documentNumber === "string" && input.data.documentNumber.trim()
    ? input.data.documentNumber.trim()
    : null;
  const documentNumber = providedNumber ?? fallbackNumber;

  const selectedTemplate = input.templateId
    ? await prisma.documentTemplate.findFirst({ where: { id: input.templateId, tenantId: context.tenantId, active: true } })
    : null;
  const templateByProject = selectedTemplate
    ?? await prisma.documentTemplate.findFirst({ where: { tenantId: context.tenantId, type: input.type, active: true }, orderBy: { createdAt: "desc" } });
  const earlyTemplateBody = templateByProject?.body && templateByProject.body.length > 100
    && !templateByProject.body.includes("data-pdf-layout-template")
    && !templateByProject.body.includes("data-exact-pdf-draft")
    ? templateByProject.body : defaultLetterBody(input.type);
  const templateNeedsFileMarkup = /\{\{\s*files\./i.test(earlyTemplateBody);

  const snapshot = await buildPlotDocumentSnapshot(context, input.recordId, { includeFileMarkup: templateNeedsFileMarkup });
  applyDraftOverrides(snapshot, input.data);
  snapshot.variables["document.number"] = documentNumber;
  snapshot.variables["document.date"] = new Date().toLocaleDateString("en-IN");
  await ensureProjectLetterTemplates(context.tenantId, snapshot.projectId);

  const template = selectedTemplate
    ?? await prisma.documentTemplate.findFirst({ where: { tenantId: context.tenantId, projectId: snapshot.projectId, type: input.type, active: true }, orderBy: { createdAt: "desc" } })
    ?? templateByProject;
  const hasRealBody = template?.body && template.body.length > 100 && !template.body.includes("data-pdf-layout-template") && !template.body.includes("data-exact-pdf-draft");
  const templateBody = hasRealBody ? template.body : defaultLetterBody(input.type);
  const { html, missingVariables, usedFileVariables } = renderTemplate(templateBody, snapshot.variables, snapshot.fileVariables);
  const reconciledHtml = reconcileStructuredBlocks(html, snapshot.variables);
  const draftHtml = usedFileVariables ? reconciledHtml : appendSupportingDocumentPages(reconciledHtml, snapshot.supportingDocumentPages);

  const { fileVariables: _fv, supportingDocumentPages: _sp, ...snapshotMeta } = snapshot;
  const document = await prisma.generatedDocument.create({
    data: {
      tenantId: context.tenantId,
      templateId: template?.id,
      type: input.type,
      recordType: input.recordType,
      recordId: input.recordId,
      data: {
        ...snapshotMeta,
        templateBody,
        missingVariables,
      } as Prisma.InputJsonValue,
      editableHtml: draftHtml,
      status: DocumentStatus.DRAFT,
      number: documentNumber,
      createdById: context.userId,
    },
  });

  await linkDocumentToLatestOwnershipRecord(context, document);
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "GeneratedDocument", entityId: document.id, after: document as unknown as Prisma.InputJsonValue });
  return { document, missingVariables };
}

function applyDraftOverrides(
  snapshot: {
    variables: Record<string, string>;
    fileVariables?: Record<string, string>;
  },
  data: Record<string, unknown>,
) {
  const customLetterFields = jsonRecord(data.customLetterFields);
  for (const [key, value] of Object.entries(customLetterFields)) {
    snapshot.variables[`manual.${key}`] = typeof value === "string" ? value : String(value ?? "");
  }

  const customLetterFiles = jsonRecord(data.customLetterFiles);
  for (const [key, value] of Object.entries(customLetterFiles)) {
    const files = Array.isArray(value) ? value.map(jsonRecord) : [];
    const names = files.map((file) => String(file.fileName ?? "")).filter(Boolean).join(", ");
    if (names) snapshot.variables[`manual.${key}`] = names;
  }
}

export async function updateDocumentDraft(context: RequestContext, id: string, input: z.infer<typeof updateDocumentDraftSchema>) {
  const before = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  const document = await prisma.generatedDocument.update({
    where: { id },
    data: {
      editableHtml: input.editableHtml,
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
  const html = await resolveFileUrlsToDataUris(context.tenantId, document.editableHtml ?? "");
  const pdf = await buildGeneratedDocumentPdfFromHtml({
    title: document.type.replaceAll("_", " ").toUpperCase(),
    number: document.number,
    tenantName: tenant?.name ?? "WIDESTATE OS",
    html,
  });
  return persistRenderedDocument(context, document, pdf);
}

async function persistRenderedDocument(
  context: RequestContext,
  document: GeneratedDocument,
  pdf: Buffer,
) {
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
    where: { id: document.id },
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
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "GeneratedDocument", entityId: document.id, after: rendered as unknown as Prisma.InputJsonValue });
  return { document: rendered, file, storage: stored };
}

export const approveDocumentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "ISSUED"]),
  notes: z.string().optional(),
});

export async function approveDocument(context: RequestContext, id: string, input: z.infer<typeof approveDocumentSchema>) {
  const current = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  if (input.status === "APPROVED" || input.status === "ISSUED") {
    if (!current.fileAssetId) {
      const error = new Error("Generate the PDF before approving or issuing it.");
      error.name = "BadRequestError";
      throw error;
    }
  }
  const document = await prisma.generatedDocument.update({
    where: { id, tenantId: context.tenantId },
    data: {
      status: input.status,
      approvedById: context.userId,
      approvedAt: input.status === "APPROVED" || input.status === "ISSUED" ? new Date() : undefined,
    },
  });
  await reconcilePlotOwnershipForDocument(context, document);
  await writeAuditEvent(context, { action: input.status === "APPROVED" ? AuditAction.APPROVE : AuditAction.REJECT, entityType: "GeneratedDocument", entityId: id, after: { ...document, notes: input.notes } });
  await createNotification(context, {
    title: `Document ${input.status.toLowerCase()}`,
    body: `${document.number ?? document.type} was marked ${input.status}.`,
    data: { documentId: id, status: input.status },
  });
  return document;
}

export async function deleteDocument(context: RequestContext, id: string) {
  const document = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  // Detach any ownership records that still point at this letter (plain String? field, no FK cascade).
  await prisma.ownershipRecord.updateMany({ where: { tenantId: context.tenantId, documentId: id }, data: { documentId: null } });
  // Remove revision history, then the document itself (hard delete — no deletedAt column).
  await prisma.generatedDocumentRevision.deleteMany({ where: { tenantId: context.tenantId, documentId: id } });
  await prisma.generatedDocument.delete({ where: { id } });
  await writeAuditEvent(context, { action: AuditAction.DELETE, entityType: "GeneratedDocument", entityId: id, before: document });
  await createNotification(context, {
    title: "Document deleted",
    body: `${document.number ?? document.type} was deleted.`,
    data: { documentId: id, status: "DELETED" },
  });
  return { id };
}

async function linkDocumentToLatestOwnershipRecord(context: RequestContext, document: GeneratedDocument) {
  if (document.recordType !== "Plot") return;
  const lower = document.type.toLowerCase();
  const kind = lower.includes("transfer")
    ? OwnershipKind.TRANSFER
    : lower.includes("allotment")
      ? OwnershipKind.ALLOTMENT
      : null;
  if (!kind) return;
  const record = await prisma.ownershipRecord.findFirst({
    where: { tenantId: context.tenantId, plotId: document.recordId, kind, documentId: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return;
  await prisma.ownershipRecord.update({ where: { id: record.id }, data: { documentId: document.id } });
}

async function reconcilePlotOwnershipForDocument(context: RequestContext, document: GeneratedDocument) {
  if (document.recordType !== "Plot" || !document.type.toLowerCase().match(/allotment|transfer/)) return;
  const linked = await prisma.ownershipRecord.findFirst({
    where: { tenantId: context.tenantId, plotId: document.recordId, documentId: document.id },
  });
  if (!linked || (linked.kind !== OwnershipKind.ALLOTMENT && linked.kind !== OwnershipKind.TRANSFER)) return;

  if (document.status === DocumentStatus.APPROVED || document.status === DocumentStatus.ISSUED) {
    await prisma.plot.update({
      where: { id: document.recordId },
      data: {
        currentOwnerId: linked.ownerId,
        status: linked.kind === OwnershipKind.TRANSFER ? PlotStatus.TRANSFERRED : PlotStatus.ALLOTTED,
      },
    });
    return;
  }

  if (document.status !== DocumentStatus.REJECTED) return;
  const fallback = await previousAcceptedOwnership(context.tenantId, document.recordId, linked.id);
  await prisma.plot.update({
    where: { id: document.recordId },
    data: fallback
      ? {
          currentOwnerId: fallback.ownerId,
          status: fallback.kind === OwnershipKind.TRANSFER ? PlotStatus.TRANSFERRED : fallback.kind === OwnershipKind.ALLOTMENT ? PlotStatus.ALLOTTED : PlotStatus.COMPANY_OWNED,
        }
      : { currentOwnerId: null, status: PlotStatus.COMPANY_OWNED },
  });
}

async function previousAcceptedOwnership(tenantId: string, plotId: string, excludedRecordId: string) {
  const records = await prisma.ownershipRecord.findMany({
    where: { tenantId, plotId, id: { not: excludedRecordId }, kind: { in: [OwnershipKind.COMPANY_INVENTORY, OwnershipKind.ALLOTMENT, OwnershipKind.TRANSFER] } },
    orderBy: { effectiveAt: "desc" },
  });
  for (const record of records) {
    if (record.kind === OwnershipKind.COMPANY_INVENTORY) return record;
    if (!record.documentId) return record;
    const document = await prisma.generatedDocument.findFirst({
      where: { id: record.documentId, tenantId, status: { in: [DocumentStatus.APPROVED, DocumentStatus.ISSUED] } },
      select: { id: true },
    });
    if (document) return record;
  }
  return null;
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

async function buildPlotDocumentSnapshot(context: RequestContext, plotId: string, options: { includeFileMarkup?: boolean } = {}) {
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
  const firmDetails = jsonRecord(extraDetails.firm);
  const extraPlot = jsonRecord(extraDetails.plot);
  const witnessList = Array.isArray(extraDetails.witnesses) ? extraDetails.witnesses.map(jsonRecord) : [];
  // Signatory: prefer the partner chosen on the allotment form, fall back to letterhead, then a generic label.
  const signatoryName =
    (typeof firmDetails.authorizedPerson === "string" && firmDetails.authorizedPerson) ||
    stringFromKyc(jsonRecord(tenant.letterhead), ["signatoryName"]) ||
    "Authorized Signatory";
  // Signatory relation + authority-letter date are firm-level, but there is no firm-settings UI yet,
  // so accept them per-allotment (extraDetails.firm.*) and fall back to the letterhead if configured.
  const letterhead = jsonRecord(tenant.letterhead);
  const signatoryRelation =
    stringFromKyc(firmDetails, ["signatoryRelation", "authorizedPersonRelation"]) ||
    stringFromKyc(letterhead, ["signatoryRelation"]);
  const signatoryAuthorizationDate =
    stringFromKyc(firmDetails, ["authorizationDate", "signatoryAuthorizationDate"]) ||
    stringFromKyc(letterhead, ["authorizationDate"]);
  // Price: the user enters total + per-unit on the form (pricing.*); fall back to the derived ownership amount.
  const perUnitPrice = pricing.perUnitPrice ? Number(pricing.perUnitPrice) : null;
  const totalPrice = pricing.totalAreaPrice
    ? Number(pricing.totalAreaPrice)
    : pricing.calculatedPrice
      ? Number(pricing.calculatedPrice)
      : priceInr;
  const bspRateValue = perUnitPrice ?? bspRate;
  const eStampNumber = stringFromKyc(extraDetails, ["eStampNumber"]);
  const eStampDateRaw = stringFromKyc(extraDetails, ["eStampDate"]);
  const eStampDateDots = /^\d{4}-\d{2}-\d{2}$/.test(eStampDateRaw) ? formatDateDots(new Date(eStampDateRaw)) : "";
  // The allotment letter has up to three E-Stamp slots (Self Declaration, Consent, Buyers' Agreement).
  // Map the entered stamps to those slots in order so each slot shows its own number/date.
  const stampList = Array.isArray(extraDetails.stamps) ? extraDetails.stamps.map(jsonRecord) : [];
  const stampNo = (index: number) => stringFromKyc(jsonRecord(stampList[index]), ["number"]);
  const stampDateDots = (index: number) => {
    const raw = stringFromKyc(jsonRecord(stampList[index]), ["dated"]);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? formatDateDots(new Date(raw)) : "";
  };
  const oldPlotCode = stringFromKyc(extraPlot, ["oldCode"]);
  const newPlotCode = stringFromKyc(extraPlot, ["newCode"]) || plot.code;
  const paymentTableRows = buildPaymentTableRows(payments);
  const allottee = jsonRecord(extraDetails.allottee);
  const additionalFields = Array.isArray(extraDetails.additionalFields) ? extraDetails.additionalFields.map(jsonRecord) : [];
  const customLetterFields = jsonRecord(extraDetails.customLetterFields);
  const customLetterFiles = jsonRecord(extraDetails.customLetterFiles);
  const allotteeFileNames = collectNestedFileNames(
    Array.isArray(allottee.documents) ? allottee.documents.map(jsonRecord) : [],
    "files",
  );
  const paymentFileNames = collectNestedFileNames(payments, "files");
  const additionalFieldFileNames = collectNestedFileNames(
    additionalFields.filter((field) => field.inputType === "FILE"),
    "files",
  );
  const allotteeDocumentFiles = collectNestedFiles(
    Array.isArray(allottee.documents) ? allottee.documents.map(jsonRecord) : [],
    "files",
  );
  const paymentFiles = collectNestedFiles(payments, "files");
  const additionalFieldFiles = collectNestedFiles(
    additionalFields.filter((field) => field.inputType === "FILE"),
    "files",
  );
  const fileVariables: Record<string, string> = options.includeFileMarkup ? {
    "files.allotteeDocuments": await buildInlineFileMarkup(context.tenantId, allotteeDocumentFiles),
    "files.paymentDocuments": await buildInlineFileMarkup(context.tenantId, paymentFiles),
    "files.additionalFields": await buildInlineFileMarkup(context.tenantId, additionalFieldFiles),
    "files.allSupportingDocuments": await buildInlineFileMarkup(context.tenantId, [...allotteeDocumentFiles, ...paymentFiles, ...additionalFieldFiles]),
  } : {};
  if (options.includeFileMarkup) {
    for (const [key, value] of Object.entries(customLetterFiles)) {
      const files = Array.isArray(value) ? value.map(jsonRecord) : [];
      fileVariables[`manual.${key}`] = await buildInlineFileMarkup(context.tenantId, files);
    }
  }
  const supportingDocumentPages = await buildSupportingDocumentPagesLight(context.tenantId, plot.id, plot.currentOwnerId, extraDetails);
  const variables: Record<string, string> = {
    "tenant.name": tenant.name,
    "tenant.address": tenant.address ?? tenant.region ?? "",
    "tenant.gstin": tenant.gstin ?? "",
    "tenant.pan": tenant.pan ?? "",
    "tenant.contactEmail": tenant.contactEmail ?? "",
    "tenant.contactPhone": tenant.contactPhone ?? "",
    "firm.name": firmName,
    "firm.nameUpper": firmNameUpper,
    "firm.address": tenant.address ?? tenant.region ?? projectAddress,
    "firm.paymentName": firmNameUpper,
    "firm.signatory.name": signatoryName,
    "firm.signatory.relation": signatoryRelation,
    "firm.signatory.authorizationDate": signatoryAuthorizationDate,
    "firm.partnerDescription": stringFromKyc(jsonRecord(tenant.letterhead), ["partnerDescription"]) || "",
    "project.name": plot.project.name,
    "project.nameUpper": projectName.toUpperCase(),
    "project.city": plot.project.city,
    "project.address": plot.project.address ?? "",
    "project.fullAddress": projectAddress,
    "project.approvalAuthority": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["approvalAuthority"]) || "Competent Authority cum Deputy Director, Local Body Government, Patiala under PAPRA Act 1995",
    "project.revenueEstate": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["revenueEstate"]) || plot.project.city || "",
    "project.developedLandDescription": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["developedLandDescription"]) || "",
    "plot.code": plot.code,
    "plot.areaSqft": plot.areaSqft?.toString() ?? "",
    "plot.areaSqyd": areaSqyd ? formatNumber(areaSqyd) : "",
    "plot.areaSqydApprox": areaSqyd ? `${formatNumber(areaSqyd)} Sq. Yds. approx.` : "",
    "plot.priceInr": plot.priceInr?.toString() ?? "",
    "plot.priceInrFormatted": totalPrice ? formatIndianAmount(totalPrice) : "",
    "plot.priceInrWords": totalPrice ? numberToIndianWords(totalPrice) : "",
    "plot.bspRate": bspRateValue ? formatIndianAmount(bspRateValue) : "",
    "plot.oldCode": oldPlotCode,
    "plot.newCode": newPlotCode,
    "plot.facing": plot.facing ?? "",
    "plot.dimensions": plot.dimensions ?? "",
    "plot.primeLocation": plot.primeLocation ?? "",
    "plot.northBoundary": stringFromKyc(boundaries, ["north"]),
    "plot.southBoundary": stringFromKyc(boundaries, ["south"]),
    "plot.eastBoundary": stringFromKyc(boundaries, ["east"]),
    "plot.westBoundary": stringFromKyc(boundaries, ["west"]),
    "plot.eastSize": stringFromKyc(boundaries, ["eastDimension"]),
    "plot.eastAdjoining": stringFromKyc(boundaries, ["east"]),
    "plot.westSize": stringFromKyc(boundaries, ["westDimension"]),
    "plot.westAdjoining": stringFromKyc(boundaries, ["west"]),
    "plot.northSize": stringFromKyc(boundaries, ["northDimension"]),
    "plot.northAdjoining": stringFromKyc(boundaries, ["north"]),
    "plot.southSize": stringFromKyc(boundaries, ["southDimension"]),
    "plot.southAdjoining": stringFromKyc(boundaries, ["south"]),
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
    "payment.tableRows": paymentTableRows,
    "witness.1.name": stringFromKyc(jsonRecord(witnessList[0]), ["name"]),
    "witness.1.aadhaar": stringFromKyc(jsonRecord(witnessList[0]), ["aadhaar"]),
    "witness.1.address": stringFromKyc(jsonRecord(witnessList[0]), ["address"]),
    "witness.2.name": stringFromKyc(jsonRecord(witnessList[1]), ["name"]),
    "witness.2.aadhaar": stringFromKyc(jsonRecord(witnessList[1]), ["aadhaar"]),
    "witness.2.address": stringFromKyc(jsonRecord(witnessList[1]), ["address"]),
    "files.allotteeDocuments": allotteeFileNames.join(", "),
    "files.paymentDocuments": paymentFileNames.join(", "),
    "files.additionalFields": additionalFieldFileNames.join(", "),
    "files.allSupportingDocuments": [...allotteeFileNames, ...paymentFileNames, ...additionalFieldFileNames].join(", "),
    "extra.eStampNumber": stringFromKyc(extraDetails, ["eStampNumber"]),
    "extra.witnessDetails": stringFromKyc(extraDetails, ["witnessDetails"]),
    "registry.status": registry?.status ?? "Not started",
    "registry.number": registry?.registryNo ?? "",
    "registry.date": registry?.registryDate?.toLocaleDateString("en-IN") ?? "",
    "today": new Date().toLocaleDateString("en-IN"),
    "todayDots": formatDateDots(new Date()),
    "rera.number": plot.project.reraNumber ?? "",
    "stamp.amount": "50/-",
    "stamp.estampNo": stampNo(0) || eStampNumber,
    "stamp.date": stampDateDots(0) || eStampDateDots || formatDateDots(new Date()),
    "stamp.2.estampNo": stampNo(1),
    "stamp.2.date": stampDateDots(1),
    "stamp.3.estampNo": stampNo(2),
    "stamp.3.date": stampDateDots(2),
    "possession.date": "",
    "agreement.place": plot.project.city || "Barnala",
    "witness.place": plot.project.city || "Barnala",
  };
  for (const [key, value] of Object.entries(customLetterFields)) variables[`manual.${key}`] = typeof value === "string" ? value : String(value ?? "");
  for (const [key, value] of Object.entries(customLetterFiles)) {
    if (variables[`manual.${key}`]) continue;
    const files = Array.isArray(value) ? value.map(jsonRecord) : [];
    variables[`manual.${key}`] = files.map((file) => String(file.fileName ?? "")).filter(Boolean).join(", ");
  }

  return {
    variables,
    fileVariables,
    plotId: plot.id,
    projectId: plot.projectId,
    ownerId: plot.currentOwnerId,
    ownershipRecordId: ownership?.id ?? null,
    registryRecordId: registry?.id ?? null,
    supportingDocumentPages,
  };
}

async function buildSupportingDocumentPages(tenantId: string, plotId: string, ownerId: string | null, extraDetails: Record<string, unknown>) {
  const fileIds = await collectSupportingFileIds(tenantId, plotId, ownerId, extraDetails);
  if (!fileIds.length) return [];
  const files = await prisma.fileAsset.findMany({
    where: { tenantId, id: { in: fileIds }, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  // Build attachment blocks, then pack several per page instead of one image per page.
  const blocks: string[] = [];
  for (const file of files) {
    if (!file.mimeType.startsWith("image/")) continue;
    try {
      const bytes = await getObjectResilient(file.storageKey);
      const dataUri = `data:${file.mimeType};base64,${bytes.toString("base64")}`;
      blocks.push(`<div class="attachment-block"><img src="${dataUri}" alt="${escapeHtml(file.fileName)}" /></div>`);
    } catch {
      blocks.push(`<div class="attachment-block"><p class="center muted">${escapeHtml(file.fileName)} (could not be loaded)</p></div>`);
    }
  }
  if (!blocks.length) return [];

  const perPage = 3;
  const pages: string[] = [];
  for (let i = 0; i < blocks.length; i += perPage) {
    const heading = i === 0 ? "<h2>Supporting documents</h2>" : "";
    pages.push(`<section data-letter-page="0">${heading}${blocks.slice(i, i + perPage).join("")}</section>`);
  }
  return pages;
}

async function buildSupportingDocumentPagesLight(tenantId: string, plotId: string, ownerId: string | null, extraDetails: Record<string, unknown>) {
  const fileIds = await collectSupportingFileIds(tenantId, plotId, ownerId, extraDetails);
  if (!fileIds.length) return [];
  const files = await prisma.fileAsset.findMany({
    where: { tenantId, id: { in: fileIds }, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const blocks: string[] = [];
  for (const file of files) {
    if (file.mimeType.startsWith("image/")) {
      blocks.push(`<div class="attachment-block"><img src="/api/v1/files/${file.id}/download?disposition=inline" alt="${escapeHtml(file.fileName)}" /></div>`);
    } else {
      blocks.push(`<div class="attachment-block"><p class="center muted">${escapeHtml(file.fileName)}</p></div>`);
    }
  }
  if (!blocks.length) return [];
  const perPage = 3;
  const pages: string[] = [];
  for (let i = 0; i < blocks.length; i += perPage) {
    const heading = i === 0 ? "<h2>Supporting documents</h2>" : "";
    pages.push(`<section data-letter-page="0">${heading}${blocks.slice(i, i + perPage).join("")}</section>`);
  }
  return pages;
}

async function collectSupportingFileIds(tenantId: string, plotId: string, ownerId: string | null, extraDetails: Record<string, unknown>) {
  const ids = new Set<string>();
  const allottee = jsonRecord(extraDetails.allottee);
  const documents = Array.isArray(allottee.documents) ? allottee.documents.map(jsonRecord) : [];
  for (const document of documents) {
    const files = Array.isArray(document.files) ? document.files.map(jsonRecord) : [];
    for (const file of files) if (typeof file.id === "string") ids.add(file.id);
  }
  const payments = Array.isArray(extraDetails.payments) ? extraDetails.payments.map(jsonRecord) : [];
  for (const payment of payments) {
    const files = Array.isArray(payment.files) ? payment.files.map(jsonRecord) : [];
    for (const file of files) if (typeof file.id === "string") ids.add(file.id);
  }
  const customLetterFiles = jsonRecord(extraDetails.customLetterFiles);
  for (const value of Object.values(customLetterFiles)) {
    const files = Array.isArray(value) ? value.map(jsonRecord) : [];
    for (const file of files) if (typeof file.id === "string") ids.add(file.id);
  }
  const additionalFields = Array.isArray(extraDetails.additionalFields) ? extraDetails.additionalFields.map(jsonRecord) : [];
  for (const field of additionalFields) {
    if (field.inputType !== "FILE") continue;
    const files = Array.isArray(field.files) ? field.files.map(jsonRecord) : [];
    for (const file of files) if (typeof file.id === "string") ids.add(file.id);
  }
  const fallbackFiles = await prisma.fileAsset.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { ownerType: "Plot", ownerId: plotId, categoryKey: "allotment-payment" },
        { ownerType: "Plot", ownerId: plotId, categoryKey: "allotment-extra" },
        ...(ownerId ? [{ ownerType: "Owner", ownerId, categoryKey: "allottee-kyc" }] : []),
      ],
    },
    select: { id: true },
  });
  for (const file of fallbackFiles) ids.add(file.id);
  return [...ids];
}

function appendSupportingDocumentPages(html: string, pages: string[]) {
  if (!pages.length) return html;
  return `${html}${pages.join("")}`;
}

// Keys whose value is HTML built server-side (already safe) and must be inserted unescaped.
const RAW_HTML_KEYS = new Set(["payment.tableRows"]);

function renderTemplate(template: string, variables: Record<string, string>, fileVariables: Record<string, string> = {}) {
  const missingVariables: string[] = [];
  let usedFileVariables = false;
  const replaceVariable = (_match: string, key: string) => {
    if (key in fileVariables) {
      usedFileVariables = true;
      return fileVariables[key] || "";
    }
    const value = variables[key] ?? "";
    if (RAW_HTML_KEYS.has(key)) return value;
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
  return {
    html: normalizeAttachmentPlacement(html),
    missingVariables: [...new Set(missingVariables)],
    usedFileVariables,
  };
}


function documentTypeForLetter(type: string): RealEstateDocumentType {
  if (type.toLowerCase().includes("transfer")) return RealEstateDocumentType.TRANSFER_LETTER;
  if (type.toLowerCase().includes("registry")) return RealEstateDocumentType.OTHER;
  return RealEstateDocumentType.ALLOTMENT_LETTER;
}

// Safety net for structured blocks whose dynamic placeholders can be lost when a template is
// edited/saved (e.g. `{{payment.tableRows}}` sits as loose text directly inside <table>, which
// the contenteditable editor can drop, freezing the table into empty rows). We re-inject the
// real rows by anchoring on the table's `payments` class instead of trusting the placeholder to
// survive — so cheque/payment data always reaches the draft. Idempotent: when the placeholder
// did survive and rendered correctly, this reproduces the same header + data rows.
function reconcileStructuredBlocks(html: string, variables: Record<string, string>) {
  const paymentRows = variables["payment.tableRows"];
  if (!paymentRows) return html;
  return html.replace(
    /(<table\b[^>]*class="[^"]*\bpayments\b[^"]*"[^>]*>)([\s\S]*?)(<\/table>)/gi,
    (_full, open: string, inner: string, close: string) => {
      const rows = inner.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
      const headerRows = rows.filter((row) => /<th[\s>]/i.test(row));
      return `${open}${headerRows.join("")}${paymentRows}${close}`;
    },
  );
}

function buildPaymentTableRows(payments: Record<string, unknown>[]) {
  const rows: string[] = [];
  for (const payment of payments) {
    if (!payment.amount && !payment.reference && !payment.date && !payment.bank) continue;
    const chequeNo = escapeHtml(String(payment.reference ?? ""));
    const dateStr = typeof payment.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payment.date)
      ? formatDateDots(new Date(payment.date))
      : escapeHtml(String(payment.date ?? ""));
    const amount = payment.amount ? escapeHtml(formatIndianAmount(Number(payment.amount))) : "";
    const bank = escapeHtml(String(payment.bank ?? ""));
    rows.push(`<tr><td>${chequeNo}</td><td>${dateStr}</td><td>${amount}</td><td>${bank}</td></tr>`);
  }
  // Keep a few blank rows so the table retains its shape and leaves room for manual additions.
  for (let i = rows.length; i < 4; i++) rows.push("<tr><td></td><td></td><td></td><td></td></tr>");
  return rows.join("");
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

function collectNestedFiles(items: Record<string, unknown>[], key: string) {
  return items.flatMap((item) => Array.isArray(item[key]) ? item[key].map(jsonRecord) : []);
}

function collectNestedFileNames(items: Record<string, unknown>[], key: string) {
  return items.flatMap((item) => {
    const files = Array.isArray(item[key]) ? item[key].map(jsonRecord) : [];
    return files.map((file) => String(file.fileName ?? "")).filter(Boolean);
  });
}

async function resolveFileUrlsToDataUris(tenantId: string, html: string) {
  const pattern = /src="\/api\/v1\/files\/([a-zA-Z0-9_-]+)\/download\?disposition=inline"/g;
  const fileIds = [...html.matchAll(pattern)].map((m) => m[1]);
  if (!fileIds.length) return html;
  const assets = await prisma.fileAsset.findMany({
    where: { tenantId, id: { in: [...new Set(fileIds)] }, deletedAt: null },
  });
  const resolved = new Map<string, string>();
  for (const asset of assets) {
    if (!asset.mimeType.startsWith("image/")) continue;
    try {
      const bytes = await getObjectResilient(asset.storageKey);
      resolved.set(asset.id, `data:${asset.mimeType};base64,${bytes.toString("base64")}`);
    } catch {
      // Leave the URL as-is if the file can't be read.
    }
  }
  return html.replace(pattern, (match, id: string) => {
    const dataUri = resolved.get(id);
    return dataUri ? `src="${dataUri}"` : match;
  });
}

async function buildInlineFileMarkup(tenantId: string, refs: Record<string, unknown>[]) {
  const fileIds = refs.map((file) => typeof file.id === "string" ? file.id : "").filter(Boolean);
  if (!fileIds.length) return "";
  const assets = await prisma.fileAsset.findMany({
    where: { tenantId, id: { in: fileIds }, deletedAt: null },
  });
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const blocks: string[] = [];

  for (const ref of refs) {
    const id = typeof ref.id === "string" ? ref.id : "";
    const name = typeof ref.fileName === "string" ? ref.fileName : "Uploaded file";
    const asset = assetById.get(id);
    if (!asset) continue;
    if (asset.mimeType.startsWith("image/")) {
      try {
        const bytes = await getObjectResilient(asset.storageKey);
        blocks.push(
          `<div class="attachment-block inline-attachment-block"><img src="data:${asset.mimeType};base64,${bytes.toString("base64")}" alt="${escapeHtml(name)}" /></div>`,
        );
      } catch {
        blocks.push(`<div class="attachment-block inline-attachment-block"><p class="center muted">${escapeHtml(name)}</p><p class="center muted">This image could not be loaded for preview.</p></div>`);
      }
      continue;
    }
    blocks.push(`<div class="attachment-block inline-attachment-block"><p class="center muted">${escapeHtml(name)}</p><p class="center muted">Preview not available for this file type.</p></div>`);
  }

  return blocks.join("");
}

function normalizeAttachmentPlacement(html: string) {
  let normalized = html;
  const paragraphWithBlockPattern = /<p([^>]*)>([\s\S]*?)(<div class="attachment-block inline-attachment-block">[\s\S]*?<\/div>)([\s\S]*?)<\/p>/i;
  while (paragraphWithBlockPattern.test(normalized)) {
    normalized = normalized.replace(paragraphWithBlockPattern, (_match, attrs: string, before: string, block: string, after: string) => {
      const prefix = before.trim() ? `<p${attrs}>${before}</p>` : "";
      const suffix = after.trim() ? `<p${attrs}>${after}</p>` : "";
      return `${prefix}${block}${suffix}`;
    });
  }
  return normalized.replace(/<p([^>]*)>\s*(<div class="attachment-block inline-attachment-block">[\s\S]*?<\/div>)\s*<\/p>/gi, "$2");
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
