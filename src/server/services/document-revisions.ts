import { AuditAction, DocumentStatus, FileAsset, FileVisibility, Prisma, RealEstateDocumentType } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { getLocalObject, getObjectResilient, putGeneratedObject, storageKey } from "../storage";
import { createGeneratedFileAsset } from "./files";

const revisionStatusSchema = z.enum(["APPROVED", "ISSUED"]);
const operationTypeSchema = z.enum(["INSERT_BEFORE", "INSERT_AFTER", "REPLACE_PAGE", "REPLACE_RANGE"]);

export const addRevisionOperationSchema = z.object({
  type: operationTypeSchema,
  targetPage: z.number().int().positive(),
  endPage: z.number().int().positive().optional(),
  sourceFileAssetId: z.string().min(1),
  sourcePages: z.array(z.number().int().positive()).optional(),
  label: z.string().optional(),
});

export const approveRevisionSchema = z.object({
  status: revisionStatusSchema,
});

type RevisionOperation = z.infer<typeof addRevisionOperationSchema> & {
  id: string;
  createdAt: string;
};

const A4_WIDTH = 595.32;
const A4_HEIGHT = 841.92;

export async function listDocumentRevisions(context: RequestContext, documentId: string) {
  const document = await requireDocument(context, documentId);
  const revisions = await prisma.generatedDocumentRevision.findMany({
    where: { tenantId: context.tenantId, documentId },
    orderBy: { revisionNo: "desc" },
  });
  return { document, revisions };
}

export async function createDocumentRevision(context: RequestContext, documentId: string) {
  const document = await requireDocument(context, documentId);
  if (!document.fileAssetId) badRequest("Generate the letter PDF before arranging pages.");

  const baseFile = await requireFile(context, document.fileAssetId);
  if (baseFile.mimeType !== "application/pdf") badRequest("The current letter file is not a PDF.");

  const [count, bytes] = await Promise.all([
    prisma.generatedDocumentRevision.count({ where: { tenantId: context.tenantId, documentId } }),
    readFileBytes(baseFile),
  ]);
  const pageCount = await countPdfPages(bytes);
  if (count === 0) {
    await prisma.generatedDocumentRevision.create({
      data: {
        tenantId: context.tenantId,
        documentId,
        revisionNo: 1,
        status: "ORIGINAL",
        baseFileId: baseFile.id,
        outputFileId: baseFile.id,
        operations: [],
        pageCount,
        createdById: context.userId,
      },
    });
  }
  const revision = await prisma.generatedDocumentRevision.create({
    data: {
      tenantId: context.tenantId,
      documentId,
      revisionNo: count === 0 ? 2 : count + 1,
      baseFileId: baseFile.id,
      operations: [],
      pageCount,
      createdById: context.userId,
    },
  });

  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "GeneratedDocumentRevision",
    entityId: revision.id,
    after: revision as unknown as Prisma.InputJsonValue,
  });

  const revisions = await prisma.generatedDocumentRevision.findMany({
    where: { tenantId: context.tenantId, documentId },
    orderBy: { revisionNo: "desc" },
  });

  return { document, revision, revisions };
}

export async function addRevisionOperation(context: RequestContext, documentId: string, revisionId: string, input: z.infer<typeof addRevisionOperationSchema>) {
  const revision = await requireDraftRevision(context, documentId, revisionId);
  const sourceFile = await requireFile(context, input.sourceFileAssetId);
  assertSupportedSource(sourceFile);
  validateTarget(input, revision.pageCount);
  if (sourceFile.mimeType === "application/pdf" && input.sourcePages?.length) {
    const pageCount = await countPdfPages(await readFileBytes(sourceFile));
    for (const page of input.sourcePages) {
      if (page > pageCount) badRequest(`Source PDF has only ${pageCount} page(s).`);
    }
  }

  const operations = revisionOperations(revision.operations);
  const operation: RevisionOperation = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const nextOperations = [...operations, operation];
  assertNoOverlappingReplacements(nextOperations, revision.pageCount);

  const updated = await prisma.generatedDocumentRevision.update({
    where: { id: revision.id },
    data: { operations: nextOperations as unknown as Prisma.InputJsonValue },
  });

  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "GeneratedDocumentRevision",
    entityId: revision.id,
    after: { operation, revisionId: revision.id } as Prisma.InputJsonValue,
  });

  return { revision: updated, operation };
}

export async function deleteRevisionOperation(context: RequestContext, documentId: string, revisionId: string, operationId: string) {
  const revision = await requireDraftRevision(context, documentId, revisionId);
  const operations = revisionOperations(revision.operations);
  const nextOperations = operations.filter((operation) => operation.id !== operationId);
  if (nextOperations.length === operations.length) notFound("Operation was not found.");

  const updated = await prisma.generatedDocumentRevision.update({
    where: { id: revision.id },
    data: { operations: nextOperations as unknown as Prisma.InputJsonValue },
  });

  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "GeneratedDocumentRevision",
    entityId: revision.id,
    after: { operationId, revisionId: revision.id } as Prisma.InputJsonValue,
  });

  return { revision: updated };
}

export async function renderDocumentRevision(context: RequestContext, documentId: string, revisionId: string) {
  const document = await requireDocument(context, documentId);
  const revision = await requireRevision(context, documentId, revisionId);
  const baseFile = await requireFile(context, revision.baseFileId);
  const operations = revisionOperations(revision.operations);
  assertNoOverlappingReplacements(operations, revision.pageCount);

  const pdf = await composePdf(context, baseFile, operations, revision.pageCount);
  const key = storageKey([context.tenantId, "generated", document.id, `revision-${revision.revisionNo}.pdf`]);
  const stored = await putGeneratedObject(key, pdf, "application/pdf");
  const file = await createGeneratedFileAsset(context, {
    storageKey: stored.storageKey,
    storageProvider: stored.storageProvider,
    fallbackStorageKey: stored.fallbackStorageKey,
    fileName: `${document.number ?? document.id}-revision-${revision.revisionNo}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: pdf.length,
    visibility: FileVisibility.OWNER_VISIBLE,
    documentType: documentTypeForLetter(document.type),
    ownerType: document.recordType,
    ownerId: document.recordId,
  });

  const rendered = await prisma.generatedDocumentRevision.update({
    where: { id: revision.id },
    data: {
      outputFileId: file.id,
      status: "GENERATED",
    },
  });

  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "GeneratedDocumentRevision",
    entityId: revision.id,
    after: { outputFileId: file.id, operations } as Prisma.InputJsonValue,
  });

  return { revision: rendered, file, storage: stored };
}

export async function approveDocumentRevision(context: RequestContext, documentId: string, revisionId: string, input: z.infer<typeof approveRevisionSchema>) {
  await requireDocument(context, documentId);
  const revision = await requireRevision(context, documentId, revisionId);
  if (!revision.outputFileId) badRequest("Generate the final PDF before approving or issuing this revision.");

  const [updatedRevision, document] = await prisma.$transaction([
    prisma.generatedDocumentRevision.update({
      where: { id: revision.id },
      data: {
        status: input.status,
        approvedById: context.userId,
        approvedAt: new Date(),
        issuedAt: input.status === "ISSUED" ? new Date() : null,
      },
    }),
    prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        fileAssetId: revision.outputFileId,
        status: input.status === "ISSUED" ? DocumentStatus.ISSUED : DocumentStatus.APPROVED,
        approvedById: context.userId,
        approvedAt: new Date(),
      },
    }),
  ]);

  await writeAuditEvent(context, {
    action: AuditAction.APPROVE,
    entityType: "GeneratedDocumentRevision",
    entityId: revision.id,
    after: updatedRevision as unknown as Prisma.InputJsonValue,
  });

  return { revision: updatedRevision, document };
}

async function composePdf(context: RequestContext, baseFile: FileAsset, operations: RevisionOperation[], basePageCount: number) {
  const output = await PDFDocument.create();
  const base = await PDFDocument.load(await readFileBytes(baseFile));
  const replaceOperations = operations
    .filter((operation) => operation.type === "REPLACE_PAGE" || operation.type === "REPLACE_RANGE")
    .sort((a, b) => a.targetPage - b.targetPage);

  for (let page = 1; page <= basePageCount; page += 1) {
    await appendInsertions(context, output, operations, page, "INSERT_BEFORE");
    const replacement = replaceOperations.find((operation) => page >= operation.targetPage && page <= replacementEnd(operation));
    if (replacement) {
      if (page === replacement.targetPage) await appendSourceFile(context, output, replacement);
    } else {
      const [copied] = await output.copyPages(base, [page - 1]);
      output.addPage(copied);
    }
    await appendInsertions(context, output, operations, page, "INSERT_AFTER");
  }

  return Buffer.from(await output.save());
}

async function appendInsertions(context: RequestContext, output: PDFDocument, operations: RevisionOperation[], targetPage: number, type: "INSERT_BEFORE" | "INSERT_AFTER") {
  const matches = operations.filter((operation) => operation.type === type && operation.targetPage === targetPage);
  for (const operation of matches) await appendSourceFile(context, output, operation);
}

async function appendSourceFile(context: RequestContext, output: PDFDocument, operation: RevisionOperation) {
  const sourceFile = await requireFile(context, operation.sourceFileAssetId);
  const bytes = await readFileBytes(sourceFile);
  if (sourceFile.mimeType === "application/pdf") {
    const source = await PDFDocument.load(bytes);
    const pageIndexes = operation.sourcePages?.length
      ? operation.sourcePages.map((page) => page - 1)
      : source.getPageIndices();
    const copied = await output.copyPages(source, pageIndexes);
    copied.forEach((page) => output.addPage(page));
    return;
  }

  const page = output.addPage([A4_WIDTH, A4_HEIGHT]);
  const image = sourceFile.mimeType === "image/png"
    ? await output.embedPng(bytes)
    : await output.embedJpg(bytes);
  const scaled = image.scaleToFit(A4_WIDTH - 72, A4_HEIGHT - 72);
  page.drawImage(image, {
    x: (A4_WIDTH - scaled.width) / 2,
    y: (A4_HEIGHT - scaled.height) / 2,
    width: scaled.width,
    height: scaled.height,
  });
}

async function requireDocument(context: RequestContext, documentId: string) {
  return prisma.generatedDocument.findFirstOrThrow({ where: { id: documentId, tenantId: context.tenantId } });
}

async function requireRevision(context: RequestContext, documentId: string, revisionId: string) {
  return prisma.generatedDocumentRevision.findFirstOrThrow({
    where: { id: revisionId, documentId, tenantId: context.tenantId },
  });
}

async function requireDraftRevision(context: RequestContext, documentId: string, revisionId: string) {
  const revision = await requireRevision(context, documentId, revisionId);
  if (revision.status !== "DRAFT") badRequest("Only draft revisions can be changed.");
  return revision;
}

async function requireFile(context: RequestContext, fileId: string) {
  return prisma.fileAsset.findFirstOrThrow({
    where: { id: fileId, tenantId: context.tenantId, deletedAt: null },
  });
}

async function readFileBytes(file: FileAsset) {
  try {
    return await getObjectResilient(file.storageKey);
  } catch (error) {
    if (!file.fallbackStorageKey) throw error;
    return getLocalObject(file.fallbackStorageKey);
  }
}

async function countPdfPages(bytes: Buffer) {
  return PDFDocument.load(bytes).then((pdf) => pdf.getPageCount());
}

function revisionOperations(value: Prisma.JsonValue): RevisionOperation[] {
  return Array.isArray(value) ? value.filter(isRevisionOperation) : [];
}

function isRevisionOperation(value: Prisma.JsonValue): value is RevisionOperation {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "id" in value && "type" in value);
}

function validateTarget(input: z.infer<typeof addRevisionOperationSchema>, pageCount: number) {
  if (input.targetPage > pageCount) badRequest(`The letter has only ${pageCount} page(s).`);
  if (input.type === "REPLACE_RANGE") {
    if (!input.endPage) badRequest("End page is required when replacing a range.");
    if (input.endPage < input.targetPage) badRequest("End page cannot be before target page.");
    if (input.endPage > pageCount) badRequest(`The letter has only ${pageCount} page(s).`);
  }
}

function assertSupportedSource(file: FileAsset) {
  if (["application/pdf", "image/jpeg", "image/png"].includes(file.mimeType)) return;
  badRequest("Only PDF, JPG, and PNG files can be added to a letter PDF.");
}

function assertNoOverlappingReplacements(operations: RevisionOperation[], pageCount: number) {
  const used = new Set<number>();
  for (const operation of operations) {
    if (operation.type !== "REPLACE_PAGE" && operation.type !== "REPLACE_RANGE") continue;
    const endPage = replacementEnd(operation);
    if (operation.targetPage > pageCount || endPage > pageCount) badRequest(`Replacement page is outside the ${pageCount}-page letter.`);
    for (let page = operation.targetPage; page <= endPage; page += 1) {
      if (used.has(page)) badRequest("Replacement ranges cannot overlap.");
      used.add(page);
    }
  }
}

function replacementEnd(operation: RevisionOperation) {
  return operation.type === "REPLACE_RANGE" ? operation.endPage ?? operation.targetPage : operation.targetPage;
}

function documentTypeForLetter(type: string): RealEstateDocumentType {
  if (type.toLowerCase().includes("transfer")) return RealEstateDocumentType.TRANSFER_LETTER;
  if (type.toLowerCase().includes("allotment")) return RealEstateDocumentType.ALLOTMENT_LETTER;
  return RealEstateDocumentType.OTHER;
}

function badRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}

function notFound(message: string): never {
  const error = new Error(message);
  error.name = "NotFoundError";
  throw error;
}
