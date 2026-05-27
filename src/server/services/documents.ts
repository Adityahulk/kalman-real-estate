import { AuditAction, DocumentStatus, FileVisibility, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { enqueueDocumentGeneration } from "../jobs";
import { putLocalObject } from "../storage";
import { createGeneratedFileAsset } from "./files";
import { buildGeneratedDocumentPdf } from "./document-pdf";
import { createNotification } from "./notifications";

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
      createdById: context.userId,
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
  await createNotification(context, {
    title: "Document generated",
    body: `${readyDocument.number ?? readyDocument.type} is ready to review and download.`,
    data: { documentId: readyDocument.id, fileAssetId: file.id },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "GeneratedDocument", entityId: document.id, after: document });
  return { document: readyDocument, file, queue };
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
          where: { id: document.recordId, tenantId: context.tenantId, currentOwnerId: owner.id, ownerVisible: true },
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
