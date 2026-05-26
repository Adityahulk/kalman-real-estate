import { AuditAction, DocumentStatus, FileVisibility, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { enqueueDocumentGeneration } from "../jobs";
import { putLocalObject } from "../storage";
import { createGeneratedFileAsset } from "./files";
import { buildGeneratedDocumentPdf } from "./document-pdf";

export const generateDocumentSchema = z.object({
  templateId: z.string().optional(),
  type: z.string().min(2),
  recordType: z.string().min(2),
  recordId: z.string().min(1),
  data: z.record(z.unknown()).default({}),
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
      createdById: context.userId === "seed-admin" ? undefined : context.userId,
    },
  });
  const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
  const pdf = await buildGeneratedDocumentPdf({
    title: input.type.replaceAll("_", " ").toUpperCase(),
    number: document.number,
    tenantName: tenant?.name ?? "Kalman Estate OS",
    body: [
      `Generated from live ${input.recordType} record ${input.recordId}.`,
      ...Object.entries(input.data).map(([key, value]) => `${key}: ${String(value)}`),
      "Review and approve this document before issuing it to the owner or external party.",
    ],
  });
  const key = `local/generated/${context.tenantId}/${document.id}.pdf`;
  await putLocalObject(key, pdf);
  const file = await createGeneratedFileAsset(context, {
    storageKey: key,
    fileName: `${document.number ?? document.id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: pdf.length,
    visibility: FileVisibility.OWNER_VISIBLE,
    ownerType: input.recordType,
    ownerId: input.recordId,
  });
  const readyDocument = await prisma.generatedDocument.update({
    where: { id: document.id },
    data: { fileAssetId: file.id, status: DocumentStatus.GENERATED },
  });
  const queue = await enqueueDocumentGeneration({ documentId: document.id, tenantId: context.tenantId });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "GeneratedDocument", entityId: document.id, after: document });
  return { document: readyDocument, file, queue };
}

export const approveDocumentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "ISSUED"]),
  notes: z.string().optional(),
});

export async function approveDocument(context: RequestContext, id: string, input: z.infer<typeof approveDocumentSchema>) {
  const document = await prisma.generatedDocument.update({
    where: { id },
    data: {
      status: input.status,
      approvedById: context.userId === "seed-admin" ? undefined : context.userId,
      approvedAt: input.status === "APPROVED" || input.status === "ISSUED" ? new Date() : undefined,
    },
  });
  await writeAuditEvent(context, { action: input.status === "APPROVED" ? AuditAction.APPROVE : AuditAction.REJECT, entityType: "GeneratedDocument", entityId: id, after: { ...document, notes: input.notes } });
  return document;
}

export async function getDocumentDownload(context: RequestContext, id: string) {
  return prisma.generatedDocument.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });
}
