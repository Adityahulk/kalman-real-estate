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
import { createNotification, notifyRoleWithPermission } from "./notifications";
import { defaultLetterBody, letterTemplateTypeSchema, resolveActiveProjectLetterTemplate } from "./document-templates";

// Statuses in which a letter still counts as "accepted" for plot-ownership purposes. Approving a
// letter reconciles the plot to its new owner; the letter then moves on to signature (SENT_FOR_SIGNATURE
// → SIGNED) but the ownership must stay reconciled, so those later states are accepted too.
const OWNERSHIP_ACCEPTED_STATUSES: DocumentStatus[] = [
  DocumentStatus.APPROVED,
  DocumentStatus.ISSUED,
  DocumentStatus.SENT_FOR_SIGNATURE,
  DocumentStatus.SIGNED,
];

// A letter can only be edited/re-rendered while it is a working draft. Once submitted for approval
// (or approved/signed) it is locked so an executive cannot alter it behind the approver's back.
const EDITABLE_STATUSES: DocumentStatus[] = [
  DocumentStatus.DRAFT,
  DocumentStatus.GENERATED,
  DocumentStatus.CHANGES_REQUESTED,
];

function assertDocumentEditable(status: DocumentStatus) {
  if (!EDITABLE_STATUSES.includes(status)) {
    const error = new Error(
      `This letter is ${status.replaceAll("_", " ").toLowerCase()} and can no longer be edited.`,
    );
    error.name = "BadRequestError";
    throw error;
  }
}

export const generateDocumentSchema = z.object({
  templateId: z.string().optional(),
  type: z.string().min(2),
  recordType: z.string().min(2),
  recordId: z.string().min(1),
  data: z.record(z.unknown()).default({}),
});

export const createDocumentDraftSchema = z.object({
  templateId: z.string().optional(),
  type: letterTemplateTypeSchema,
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

  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: input.recordId, tenantId: context.tenantId, archivedAt: null },
    select: { projectId: true },
  });
  const template = await resolveActiveProjectLetterTemplate(
    context.tenantId,
    plot.projectId,
    input.type,
    input.templateId,
  );
  const earlyTemplateBody = isUsableLetterTemplateBody(template?.body)
    ? template.body
    : defaultLetterBody(input.type);
  const templateNeedsFileMarkup = /\{\{\s*files\./i.test(earlyTemplateBody);

  const snapshot = await buildPlotDocumentSnapshot(context, input.recordId, { documentType: input.type, includeFileMarkup: templateNeedsFileMarkup });
  applyDraftOverrides(snapshot, input.data);
  const documentDate = new Date();
  snapshot.variables["document.number"] = documentNumber;
  snapshot.variables["document.date"] = documentDate.toLocaleDateString("en-IN");
  snapshot.variables["document.dateDots"] = formatDateDots(documentDate);
  snapshot.variables["document.dateSlashes"] = formatDateSlashes(documentDate);
  const templateBody = isUsableLetterTemplateBody(template?.body) ? template.body : defaultLetterBody(input.type);
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

function isUsableLetterTemplateBody(body: string | null | undefined): body is string {
  return Boolean(
    body
      && body.length > 100
      && !body.includes("data-pdf-layout-template")
      && !body.includes("data-exact-pdf-draft"),
  );
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
  const before = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  assertDocumentEditable(before.status);
  const document = await prisma.generatedDocument.update({
    where: { id },
    data: {
      editableHtml: input.editableHtml,
      status: before.status === DocumentStatus.CHANGES_REQUESTED ? DocumentStatus.DRAFT : before.status,
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
  const document = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  assertDocumentEditable(document.status);
  const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
  const html = await resolveFileUrlsToDataUris(context.tenantId, document.editableHtml ?? "");
  const pdf = await buildGeneratedDocumentPdfFromHtml({
    title: document.type.replaceAll("_", " ").toUpperCase(),
    number: document.number,
    tenantName: tenant?.name ?? "WIDESTATE OS",
    html,
    isLetterDraft: true,
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

// Allotment Executive submits a generated draft for approval. Locks further editing and alerts
// everyone who can approve. Requires the PDF to exist so the approver has something to review.
export const submitDocumentSchema = z.object({
  notes: z.string().optional(),
});

export async function submitDocument(context: RequestContext, id: string, input: z.infer<typeof submitDocumentSchema>) {
  const current = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  if (current.status !== DocumentStatus.GENERATED) {
    const error = new Error(
      current.status === DocumentStatus.CHANGES_REQUESTED || current.status === DocumentStatus.DRAFT
        ? "Generate an updated PDF before submitting this letter."
        : `This letter is already ${current.status.replaceAll("_", " ").toLowerCase()}.`,
    );
    error.name = "BadRequestError";
    throw error;
  }
  if (!current.fileAssetId) {
    const error = new Error("Generate the PDF before submitting for approval.");
    error.name = "BadRequestError";
    throw error;
  }
  const document = await prisma.generatedDocument.update({
    where: { id, tenantId: context.tenantId },
    data: {
      status: DocumentStatus.SUBMITTED,
      submittedById: context.userId,
      submittedAt: new Date(),
      reviewNotes: null,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.SUBMIT,
    entityType: "GeneratedDocument",
    entityId: id,
    after: { ...document, notes: input.notes } as unknown as Prisma.InputJsonValue,
  });
  await notifyRoleWithPermission(context, "documents.approve", {
    title: "New allotment awaiting approval",
    body: `${document.number ?? document.type} has been submitted and is awaiting your approval.`,
    data: { documentId: id, status: document.status },
    excludeUserId: context.userId,
  });
  return document;
}

export const approveDocumentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED", "ISSUED"]),
  notes: z.string().optional(),
});

export async function approveDocument(context: RequestContext, id: string, input: z.infer<typeof approveDocumentSchema>) {
  const current = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  if (input.status === "ISSUED") {
    if (current.status !== DocumentStatus.APPROVED && current.status !== DocumentStatus.SENT_FOR_SIGNATURE) {
      throwBadRequest("Only an approved letter can be issued.");
    }
  } else if (current.status !== DocumentStatus.SUBMITTED) {
    throwBadRequest(
      current.status === DocumentStatus.REJECTED
        ? "This letter has already been rejected."
        : current.status === DocumentStatus.CHANGES_REQUESTED
          ? "This letter has already been returned for correction."
        : "Only a submitted letter awaiting approval can be approved or rejected.",
    );
  }
  const accepting = input.status === "APPROVED" || input.status === "ISSUED";
  if (accepting && !current.fileAssetId) {
    const error = new Error("Generate the PDF before approving or issuing it.");
    error.name = "BadRequestError";
    throw error;
  }
  const nextStatus =
    input.status === "APPROVED"
      ? DocumentStatus.APPROVED
      : input.status === "ISSUED"
        ? DocumentStatus.ISSUED
        : input.status === "CHANGES_REQUESTED"
          ? DocumentStatus.CHANGES_REQUESTED
          : DocumentStatus.REJECTED;
  const document = await prisma.generatedDocument.update({
    where: { id, tenantId: context.tenantId },
    data: {
      status: nextStatus,
      approvedById: accepting ? context.userId : current.approvedById,
      approvedAt: accepting ? new Date() : current.approvedAt,
      reviewNotes: input.status === "REJECTED" || input.status === "CHANGES_REQUESTED" ? input.notes ?? null : current.reviewNotes,
    },
  });
  await reconcilePlotOwnershipForDocument(context, document);
  await writeAuditEvent(context, {
    action: input.status === "REJECTED" || input.status === "CHANGES_REQUESTED" ? AuditAction.REJECT : AuditAction.APPROVE,
    entityType: "GeneratedDocument",
    entityId: id,
    after: { ...document, notes: input.notes } as unknown as Prisma.InputJsonValue,
  });
  if (input.status === "APPROVED") {
    await notifyRoleWithPermission(context, "documents.sign", {
      title: "Allotment approved — ready for signature",
      body: `${document.number ?? document.type} has been approved and is ready for signature.`,
      data: { documentId: id, status: document.status },
      excludeUserId: context.userId,
    });
    if (document.submittedById) {
      await createNotification(context, {
        userId: document.submittedById,
        title: "Allotment approved",
        body: `${document.number ?? document.type} was approved and sent for signature.`,
        data: { documentId: id, status: document.status },
      });
    }
  } else if (input.status === "CHANGES_REQUESTED") {
    if (document.submittedById) {
      await createNotification(context, {
        userId: document.submittedById,
        title: "Allotment returned for correction",
        body: `${document.number ?? document.type} was returned${input.notes ? `: ${input.notes}` : "."}`,
        data: { documentId: id, status: document.status },
      });
    }
    await notifyRoleWithPermission(context, "documents.submit", {
      title: "Allotment returned for correction",
      body: `${document.number ?? document.type} was returned for correction.`,
      data: { documentId: id, status: document.status },
      excludeUserId: context.userId,
    });
  } else if (input.status === "REJECTED") {
    if (document.submittedById) {
      await createNotification(context, {
        userId: document.submittedById,
        title: "Allotment rejected",
        body: `${document.number ?? document.type} was rejected${input.notes ? `: ${input.notes}` : "."}`,
        data: { documentId: id, status: document.status },
      });
    }
  } else {
    await createNotification(context, {
      title: "Document issued",
      body: `${document.number ?? document.type} was issued.`,
      data: { documentId: id, status: document.status },
    });
  }
  return document;
}

// Authorized Signatory records a physical signature: uploads the scanned signed PDF and marks the
// letter SIGNED. Permanently stores who signed and the exact date/time (via signedAt + the audit log).
export const signDocumentSchema = z.object({
  signedFileAssetId: z.string().min(1),
  notes: z.string().optional(),
});

export async function signDocument(context: RequestContext, id: string, input: z.infer<typeof signDocumentSchema>) {
  const current = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  if (current.status !== DocumentStatus.SENT_FOR_SIGNATURE && current.status !== DocumentStatus.APPROVED) {
    const error = new Error("Only approved letters awaiting signature can be signed.");
    error.name = "BadRequestError";
    throw error;
  }
  const signedFile = await prisma.fileAsset.findFirst({
    where: { id: input.signedFileAssetId, tenantId: context.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!signedFile) {
    const error = new Error("Uploaded signed copy could not be found.");
    error.name = "BadRequestError";
    throw error;
  }
  const document = await prisma.generatedDocument.update({
    where: { id, tenantId: context.tenantId },
    data: {
      status: DocumentStatus.SIGNED,
      signedById: context.userId,
      signedAt: new Date(),
      signedFileAssetId: input.signedFileAssetId,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.SIGN,
    entityType: "GeneratedDocument",
    entityId: id,
    after: { ...document, notes: input.notes } as unknown as Prisma.InputJsonValue,
  });
  // Alert the executive who submitted it and everyone who can approve, so the loop is closed.
  if (document.submittedById) {
    await createNotification(context, {
      userId: document.submittedById,
      title: "Signed document uploaded",
      body: `${document.number ?? document.type} has been signed and uploaded.`,
      data: { documentId: id, status: document.status },
    });
  }
  await notifyRoleWithPermission(context, "documents.approve", {
    title: "Signed document uploaded",
    body: `${document.number ?? document.type} has been signed and uploaded.`,
    data: { documentId: id, status: document.status },
    excludeUserId: context.userId,
  });
  return document;
}

export async function deleteDocument(context: RequestContext, id: string) {
  const document = await prisma.generatedDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  const archived = await prisma.generatedDocument.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      archivedById: context.userId,
      archiveReason: "Archived from generated letters",
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "GeneratedDocument",
    entityId: id,
    before: document as unknown as Prisma.InputJsonValue,
    after: archived as unknown as Prisma.InputJsonValue,
  });
  await createNotification(context, {
    title: "Document archived",
    body: `${document.number ?? document.type} was archived and remains available in the audit trail.`,
    data: { documentId: id, status: "ARCHIVED" },
  });
  return { id, archived: true };
}

export async function restoreDocument(context: RequestContext, id: string) {
  const before = await prisma.generatedDocument.findFirstOrThrow({
    where: { id, tenantId: context.tenantId, archivedAt: { not: null } },
  });
  const document = await prisma.generatedDocument.update({
    where: { id },
    data: { archivedAt: null, archivedById: null, archiveReason: null },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "GeneratedDocument",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: { restored: true, status: document.status } as Prisma.InputJsonValue,
  });
  return document;
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
    where: { tenantId: context.tenantId, plotId: document.recordId, kind, documentId: null, cancelledAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return;
  await prisma.ownershipRecord.update({ where: { id: record.id }, data: { documentId: document.id } });
}

async function reconcilePlotOwnershipForDocument(context: RequestContext, document: GeneratedDocument) {
  if (document.recordType !== "Plot" || !document.type.toLowerCase().match(/allotment|transfer/)) return;
  const linked = await prisma.ownershipRecord.findFirst({
    where: { tenantId: context.tenantId, plotId: document.recordId, documentId: document.id, cancelledAt: null },
  });
  if (!linked || (linked.kind !== OwnershipKind.ALLOTMENT && linked.kind !== OwnershipKind.TRANSFER)) return;

  if (OWNERSHIP_ACCEPTED_STATUSES.includes(document.status)) {
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
    where: {
      tenantId,
      plotId,
      id: { not: excludedRecordId },
      cancelledAt: null,
      kind: { in: [OwnershipKind.COMPANY_INVENTORY, OwnershipKind.ALLOTMENT, OwnershipKind.TRANSFER] },
    },
    orderBy: { effectiveAt: "desc" },
  });
  for (const record of records) {
    if (record.kind === OwnershipKind.COMPANY_INVENTORY) return record;
    if (!record.documentId) return record;
    const document = await prisma.generatedDocument.findFirst({
      where: { id: record.documentId, tenantId, archivedAt: null, status: { in: OWNERSHIP_ACCEPTED_STATUSES } },
      select: { id: true },
    });
    if (document) return record;
  }
  return null;
}

export async function getDocumentDownload(context: RequestContext, id: string) {
  const document = await prisma.generatedDocument.findFirstOrThrow({
    where: { id, tenantId: context.tenantId, archivedAt: null },
  });
  if (context.role === "PLOT_OWNER") {
    if (document.recordType !== "Plot") throwForbidden("Document is not visible to this owner");
    if (!OWNERSHIP_ACCEPTED_STATUSES.includes(document.status)) throwForbidden("Document is not approved for owner download");
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

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}

async function buildPlotDocumentSnapshot(context: RequestContext, plotId: string, options: { documentType?: string; includeFileMarkup?: boolean } = {}) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: context.tenantId } });
  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    include: {
      project: true,
      currentOwner: true,
      ownershipRecords: { include: { owner: true }, orderBy: [{ createdAt: "desc" }, { effectiveAt: "desc" }] },
      registryRecords: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const ownership = ownershipRecordForDocument(plot.ownershipRecords, options.documentType);
  const registry = plot.registryRecords[0];
  // A newly recorded transfer opens its draft before the plot's approved current owner changes.
  // Letter data must therefore come from the selected ownership record, not always plot.currentOwner.
  const documentOwner = ownership?.owner ?? plot.currentOwner;
  const ownerKyc = jsonRecord(documentOwner?.kyc);
  const fatherName = stringFromKyc(ownerKyc, ["fatherName", "father", "relationName"]);
  const ownerRelationPrefix = stringFromKyc(ownerKyc, ["relationPrefix", "relation"]) || "s/o";
  const aadhaarNo = stringFromKyc(ownerKyc, ["aadhaarNo", "aadharNo", "aadhaar", "aadhar"]);
  const panNo = stringFromKyc(ownerKyc, ["panNo", "pan"]);
  const ownerNameWithRelation = [documentOwner?.name ?? "", fatherName ? `${ownerRelationPrefix} ${fatherName}` : ""].filter(Boolean).join(" ");
  const ownerAddressRaw = documentOwner?.address ?? "";
  const ownerAddress = normalizeAddressInline(ownerAddressRaw);
  const ownerAddressMultilineHtml = addressMultilineHtml(ownerAddressRaw);
  const ownerAddressTwoLineHtml = addressTwoLineHtml(ownerAddressRaw);
  const areaSqft = plot.areaSqft ? Number(plot.areaSqft) : null;
  const areaSqyd = plot.areaSqYards ? Number(plot.areaSqYards) : areaSqft ? areaSqft / 9 : null;
  const priceInr = ownership?.amountInr ? Number(ownership.amountInr) : plot.priceInr ? Number(plot.priceInr) : null;
  const bspRate = areaSqyd && priceInr ? Math.round(priceInr / areaSqyd) : null;
  const effectiveAt = ownership?.effectiveAt ?? new Date();
  const firmName = tenant.name;
  const firmNameUpper = firmName.toUpperCase();
  const projectName = plot.project.name;
  const projectAddress = plot.project.address ?? [plot.project.city].filter(Boolean).join(", ");
  const projectCityState = [plot.project.city, plot.project.state].map((part) => part?.trim()).filter(Boolean).join(", ");
  const documentPlace = resolveDocumentPlace({
    city: plot.project.city,
    state: plot.project.state,
    projectAddress,
    firmAddress: tenant.address ?? tenant.region ?? "",
  });
  const boundaries = jsonRecord(plot.boundaries);
  const extraDetails = jsonRecord(ownership?.extraDetails);
  const transferDetails = jsonRecord(extraDetails.transfer);
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
  const perUnitPrice = firstMoney(pricing, ["perUnitPrice", "unitPrice", "pricePerUnit", "bspRate"]);
  const totalPrice =
    firstMoney(pricing, ["totalAreaPrice", "totalSalePrice", "salePrice", "totalPrice", "calculatedPrice", "amountInr"])
    ?? priceInr;
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
  // Joint (partnership) allotments: the second allottee is captured on the allotment form and
  // stored alongside the other letter inputs in extraDetails. Accept a couple of key spellings so
  // older records keep working.
  const secondAllottee = jsonRecord(
    extraDetails.secondAllottee ?? extraDetails.jointAllottee ?? extraDetails.coAllottee,
  );
  const secondName = stringFromKyc(secondAllottee, ["name"]);
  const secondRelationPrefix = stringFromKyc(secondAllottee, ["relationPrefix", "relation"]) || "s/o";
  const secondFatherName = stringFromKyc(secondAllottee, ["fatherName", "father", "relationName"]);
  const secondNameWithRelation = [secondName, secondFatherName ? `${secondRelationPrefix} ${secondFatherName}` : ""]
    .filter(Boolean)
    .join(" ");
  const secondAddressRaw = stringFromKyc(secondAllottee, ["address"]);
  const secondAddress = normalizeAddressInline(secondAddressRaw);
  const hasSecondAllottee = Boolean(secondName);
  // Share split: explicit values win; a joint allotment defaults to 50/50, a single one to 100%.
  const ownerShare = stringFromKyc(extraDetails, ["ownerShare", "firstAllotteeShare"])
    || (hasSecondAllottee ? "50%" : ownership?.sharePct ? `${ownership.sharePct}%` : "100%");
  const secondShare = stringFromKyc(secondAllottee, ["share", "sharePct"]) || (hasSecondAllottee ? "50%" : "");
  // Transfer letters: the seller (transferor) is the most recent prior ownership held by a
  // different owner, and the original allotment letter is the latest issued allotment document
  // for this plot — both are auto-filled so the transfer set matches the signed reference.
  // A transfer must retain the actual transferor. Prefer the snapshot written at the moment the
  // transfer was recorded. Older records did not have that snapshot, so fall back to the most
  // recent ownership record immediately before the active transfer record (not plot.currentOwner).
  const transferSeller = jsonRecord(transferDetails.seller);
  const activeOwnershipIndex = plot.ownershipRecords.findIndex((record) => record.id === ownership?.id);
  const sellerRecord = activeOwnershipIndex >= 0
    ? plot.ownershipRecords.slice(activeOwnershipIndex + 1).find((record) =>
        record.ownerId && !record.cancelledAt && record.kind !== OwnershipKind.COMPANY_INVENTORY,
      )
    : plot.ownershipRecords.find((record) =>
        record.ownerId && !record.cancelledAt && record.ownerId !== ownership?.ownerId,
      );
  const sellerKyc = jsonRecord(sellerRecord?.owner?.kyc);
  const sellerFatherName =
    stringFromKyc(transferSeller, ["fatherName", "father", "relationName"])
    ||
    stringFromKyc(transferDetails, ["sellerFatherName", "sellerRelationName"])
    || stringFromKyc(sellerKyc, ["fatherName", "father", "relationName"]);
  const sellerRelationPrefix =
    stringFromKyc(transferSeller, ["relationPrefix", "relation"])
    ||
    stringFromKyc(transferDetails, ["sellerRelationPrefix"])
    || stringFromKyc(sellerKyc, ["relationPrefix", "relation"])
    || "s/o Sh.";
  const sellerName = stringFromKyc(transferSeller, ["name"]) || sellerRecord?.owner?.name || "";
  const sellerNameWithRelation = [sellerName, sellerFatherName ? `${sellerRelationPrefix} ${sellerFatherName}` : ""]
    .filter(Boolean)
    .join(" ");
  const originalAllotmentDoc = await prisma.generatedDocument.findFirst({
    where: {
      tenantId: context.tenantId,
      recordId: plot.id,
      type: { in: ["allotment_letter", "allotment_letter_joint"] },
      archivedAt: null,
      status: { notIn: [DocumentStatus.REJECTED, DocumentStatus.CHANGES_REQUESTED] },
      number: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { number: true, finalizedAt: true, createdAt: true },
  });
  const originalAllotmentNumber =
    stringFromKyc(transferDetails, ["originalAllotmentNumber", "allotmentNumber"])
    || originalAllotmentDoc?.number
    || "";
  const originalAllotmentDateRaw = stringFromKyc(transferDetails, ["originalAllotmentDate", "allotmentDate"]);
  const originalAllotmentDate = originalAllotmentDateRaw
    ? /^\d{4}-\d{2}-\d{2}$/.test(originalAllotmentDateRaw)
      ? formatDateDots(new Date(originalAllotmentDateRaw))
      : originalAllotmentDateRaw
    : originalAllotmentDoc
      ? formatDateDots(originalAllotmentDoc.finalizedAt ?? originalAllotmentDoc.createdAt)
      : "";
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
  // Supporting files belong to the ownership record that generated the letter. In particular,
  // a transfer letter may append the transferee's Aadhaar/PAN/DL, but must never inherit KYC
  // files from the earlier allotment when a transfer record has not been created yet.
  const isAllotmentDocumentType = !options.documentType || options.documentType === "allotment_letter" || options.documentType === "allotment_letter_joint";
  const isTransferDocumentWithRecord = options.documentType === "transfer_letter" && ownership?.kind === OwnershipKind.TRANSFER;
  const supportingDocumentPages = isAllotmentDocumentType || isTransferDocumentWithRecord
    ? await buildSupportingDocumentPagesLight(
        context.tenantId,
        plot.id,
        documentOwner?.id ?? null,
        extraDetails,
        { includeFallbackFiles: isAllotmentDocumentType },
      )
    : [];
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
    "project.cityState": projectCityState,
    "project.state": plot.project.state ?? "",
    "project.address": plot.project.address ?? "",
    "project.fullAddress": projectAddress,
    "project.approvalAuthority": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["approvalAuthority"]) || "Competent Authority cum Deputy Director, Local Body Government, Patiala under PAPRA Act 1995",
    "project.revenueEstate": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["revenueEstate"]) || plot.project.city || "",
    "project.developedLandDescription": stringFromKyc(jsonRecord(plot.project as unknown as Record<string, unknown>), ["developedLandDescription"]) || "",
    "plot.code": plot.code,
    "plot.areaSqft": plot.areaSqft?.toString() ?? "",
    "plot.areaSqyd": areaSqyd ? formatNumber(areaSqyd) : "",
    "plot.areaSqydApprox": areaSqyd ? `${formatNumber(areaSqyd)} Sq. Yds. approx.` : "",
    "plot.priceInr": totalPrice ? String(totalPrice) : plot.priceInr?.toString() ?? "",
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
    "owner.name": documentOwner?.name ?? "",
    "owner.nameUpper": documentOwner?.name?.toUpperCase() ?? "",
    "owner.nameWithRelation": ownerNameWithRelation,
    "owner.nameWithRelationUpper": ownerNameWithRelation.toUpperCase(),
    "owner.fatherName": fatherName,
    "owner.phone": documentOwner?.phone ?? "",
    "owner.mobileNo": documentOwner?.phone ?? "",
    "owner.email": documentOwner?.email ?? "",
    "owner.address": ownerAddress,
    "owner.addressMultilineHtml": ownerAddressMultilineHtml,
    "owner.addressTwoLineHtml": ownerAddressTwoLineHtml,
    "owner.addressUpper": ownerAddress.toUpperCase(),
    "owner.aadhaarNo": aadhaarNo,
    "owner.panNo": panNo,
    "owner.share": ownerShare,
    // Second (joint) allottee — blank for single allotments, filled from the allotment form's
    // "Joint allottee" section for partnership allotments.
    "owner2.name": secondName,
    "owner2.nameUpper": secondName.toUpperCase(),
    "owner2.nameWithRelation": secondNameWithRelation,
    "owner2.nameWithRelationUpper": secondNameWithRelation.toUpperCase(),
    "owner2.fatherName": secondFatherName,
    "owner2.address": secondAddress,
    "owner2.addressUpper": secondAddress.toUpperCase(),
    "owner2.addressMultilineHtml": addressMultilineHtml(secondAddressRaw),
    "owner2.aadhaarNo": stringFromKyc(secondAllottee, ["aadhaarNo", "aadharNo", "aadhaar", "aadhar"]),
    "owner2.panNo": stringFromKyc(secondAllottee, ["panNo", "pan"]),
    "owner2.mobileNo": stringFromKyc(secondAllottee, ["mobileNo", "phone", "mobile"]),
    "owner2.share": secondShare,
    // Transfer letters: transferor + the original allotment letter reference.
    "seller.name": sellerName,
    "seller.nameWithRelation": sellerNameWithRelation,
    "seller.fatherName": sellerFatherName,
    "seller.relationPrefix": sellerRelationPrefix,
    "seller.address": normalizeAddressInline(stringFromKyc(transferSeller, ["address"]) || sellerRecord?.owner?.address || ""),
    "seller.phone": stringFromKyc(transferSeller, ["phone", "mobile"]) || sellerRecord?.owner?.phone || "",
    "seller.email": stringFromKyc(transferSeller, ["email"]) || sellerRecord?.owner?.email || "",
    "seller.aadhaarNo": stringFromKyc(transferSeller, ["aadhaarNo", "aadharNo", "aadhaar", "aadhar"]) || stringFromKyc(sellerKyc, ["aadhaarNo", "aadharNo", "aadhaar", "aadhar"]),
    "seller.panNo": stringFromKyc(transferSeller, ["panNo", "pan"]) || stringFromKyc(sellerKyc, ["panNo", "pan"]),
    "original.allotmentNumber": originalAllotmentNumber,
    "original.allotmentDate": originalAllotmentDate,
    "ownership.amountInr": ownership?.amountInr?.toString() ?? "",
    "ownership.effectiveDate": ownership?.effectiveAt.toLocaleDateString("en-IN") ?? "",
    "ownership.effectiveDateDots": formatDateDots(effectiveAt),
    "ownership.effectiveDayOrdinal": ordinal(effectiveAt.getDate()),
    "ownership.effectiveMonth": effectiveAt.toLocaleString("en-IN", { month: "long" }),
    "ownership.effectiveYear": String(effectiveAt.getFullYear()),
    "ownership.sharePct": ownership?.sharePct?.toString() ?? "100",
    "payment.totalPrice": totalPrice ? formatIndianAmount(totalPrice) : "",
    "payment.totalSalePrice": totalPrice ? formatIndianAmount(totalPrice) : "",
    "payment.perUnitPrice": perUnitPrice ? formatIndianAmount(perUnitPrice) : "",
    "payment.modes": payments.map((payment) => String(payment.mode ?? "")).filter(Boolean).join(", "),
    "payment.entries": payments.map((payment) => {
      const amount = firstMoney(payment, ["amount", "amountInr", "value"]);
      return [payment.mode, amount ? `INR ${formatIndianAmount(amount)}` : "", payment.reference].filter(Boolean).join(" - ");
    }).join("; "),
    "payment.tableRows": paymentTableRows,
    "witness.1.name": stringFromKyc(jsonRecord(witnessList[0]), ["name"]),
    "witness.1.aadhaar": stringFromKyc(jsonRecord(witnessList[0]), ["aadhaar"]),
    "witness.1.phone": stringFromKyc(jsonRecord(witnessList[0]), ["phone", "contact", "mobile", "aadhaar"]),
    "witness.1.contact": stringFromKyc(jsonRecord(witnessList[0]), ["phone", "contact", "mobile", "aadhaar"]),
    "witness.1.address": stringFromKyc(jsonRecord(witnessList[0]), ["address"]),
    "witness.2.name": stringFromKyc(jsonRecord(witnessList[1]), ["name"]),
    "witness.2.aadhaar": stringFromKyc(jsonRecord(witnessList[1]), ["aadhaar"]),
    "witness.2.phone": stringFromKyc(jsonRecord(witnessList[1]), ["phone", "contact", "mobile", "aadhaar"]),
    "witness.2.contact": stringFromKyc(jsonRecord(witnessList[1]), ["phone", "contact", "mobile", "aadhaar"]),
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
    "stamp.amount": "50",
    "stamp.estampNo": stampNo(0) || eStampNumber,
    "stamp.date": stampDateDots(0) || eStampDateDots || formatDateDots(new Date()),
    "stamp.2.estampNo": stampNo(1),
    "stamp.2.date": stampDateDots(1),
    "stamp.3.estampNo": stampNo(2),
    "stamp.3.date": stampDateDots(2),
    "possession.date": "",
    "agreement.place": documentPlace,
    "witness.place": documentPlace,
    "document.place": documentPlace,
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
    ownerId: documentOwner?.id ?? null,
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

function ownershipRecordForDocument<T extends { kind: OwnershipKind }>(records: T[], documentType?: string) {
  if (documentType === "allotment_letter" || documentType === "allotment_letter_joint") {
    return records.find((record) => record.kind === OwnershipKind.ALLOTMENT)
      ?? records.find((record) => record.kind === OwnershipKind.TRANSFER)
      ?? records.find((record) => record.kind !== OwnershipKind.COMPANY_INVENTORY)
      ?? records[0];
  }
  if (documentType === "transfer_letter") {
    return records.find((record) => record.kind === OwnershipKind.TRANSFER)
      ?? records.find((record) => record.kind === OwnershipKind.ALLOTMENT)
      ?? records.find((record) => record.kind !== OwnershipKind.COMPANY_INVENTORY)
      ?? records[0];
  }
  return records.find((record) => record.kind === OwnershipKind.TRANSFER)
    ?? records.find((record) => record.kind === OwnershipKind.ALLOTMENT)
    ?? records.find((record) => record.kind !== OwnershipKind.COMPANY_INVENTORY)
    ?? records[0];
}

async function buildSupportingDocumentPagesLight(
  tenantId: string,
  plotId: string,
  ownerId: string | null,
  extraDetails: Record<string, unknown>,
  options: { includeFallbackFiles?: boolean } = {},
) {
  const fileIds = await collectSupportingFileIds(tenantId, plotId, ownerId, extraDetails, options);
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

async function collectSupportingFileIds(
  tenantId: string,
  plotId: string,
  ownerId: string | null,
  extraDetails: Record<string, unknown>,
  options: { includeFallbackFiles?: boolean } = {},
) {
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
  if (!options.includeFallbackFiles) return [...ids];
  const fallbackFiles = await prisma.fileAsset.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { ownerType: "Plot", ownerId: plotId, categoryKey: "allotment-payment" },
        { ownerType: "Plot", ownerId: plotId, categoryKey: "allotment-extra" },
        ...(ownerId ? [
          { ownerType: "Owner", ownerId, categoryKey: "allottee-kyc" },
          { ownerType: "Owner", ownerId, categoryKey: "transfer-kyc" },
        ] : []),
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
const RAW_HTML_KEYS = new Set(["payment.tableRows", "owner.addressMultilineHtml", "owner.addressTwoLineHtml"]);

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
    const parsedAmount = firstMoney(payment, ["amount", "amountInr", "value"]);
    const amount = parsedAmount ? escapeHtml(formatIndianAmount(parsedAmount)) : "";
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

function addressLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeAddressInline(value: string) {
  return addressLines(value).join(", ");
}

function addressMultilineHtml(value: string) {
  const lines = addressLines(value);
  if (!lines.length) return "";
  return lines.map((line) => escapeHtml(line)).join("<br>");
}

/**
 * Transfer references reserve two address lines in their recipient blocks and holder table.
 * Prefer the user's explicit line breaks; otherwise split comma-separated address parts at a
 * natural midpoint. This keeps long single-line form input from stretching the letter layout.
 */
function addressTwoLineHtml(value: string) {
  const explicitLines = addressLines(value);
  if (!explicitLines.length) return "";

  const parts = explicitLines.flatMap((line) => line.split(",").map((part) => part.trim()).filter(Boolean));
  if (parts.length >= 2) {
    const splitAt = Math.max(1, Math.ceil(parts.length / 2));
    return [parts.slice(0, splitAt).join(", "), parts.slice(splitAt).join(", ")].map(escapeHtml).join("<br>");
  }

  const words = explicitLines[0].split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    const splitAt = Math.ceil(words.length / 2);
    return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")].map(escapeHtml).join("<br>");
  }
  return `${escapeHtml(explicitLines[0])}<br>`;
}

function resolveDocumentPlace({
  city,
  state,
  projectAddress,
  firmAddress,
}: {
  city: string | null;
  state: string | null;
  projectAddress: string;
  firmAddress: string;
}) {
  const normalizedCity = city?.trim() ?? "";
  const normalizedState = state?.trim() ?? "";
  const addressCity = lastAddressPart(projectAddress) || lastAddressPart(firmAddress);
  if (normalizedCity && normalizedCity.toLowerCase() !== normalizedState.toLowerCase()) return normalizedCity;
  return addressCity || normalizedCity || "Barnala";
}

function lastAddressPart(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) ?? "";
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function firstMoney(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = parseMoney(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function parseMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[₹,\s]/g, "").replace(/\/-$/, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatIndianAmount(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function formatDateDots(date: Date) {
  return date.toLocaleDateString("en-GB").replaceAll("/", ".");
}

function formatDateSlashes(date: Date) {
  return date.toLocaleDateString("en-GB");
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
