import "@/server/load-env";
import { FileVisibility, PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { generatedDocumentStorageKey, getObjectResilient, putGeneratedObject } from "@/server/storage";
import { buildGeneratedDocumentPdf, buildGeneratedDocumentPdfFromHtml } from "@/server/services/document-pdf";
import { pdfLayoutBlockingIssues, pdfLayoutDocumentSchema } from "@/lib/pdf-layout";
import { buildPdfFromLayout } from "@/server/services/pdf-template-render";

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

type DocumentJob = {
  documentId: string;
  tenantId: string;
};

async function processDocument(job: DocumentJob) {
  const document = await prisma.generatedDocument.findFirstOrThrow({
    where: { id: job.documentId, tenantId: job.tenantId },
  });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: job.tenantId } });

  const data = document.data && typeof document.data === "object" && !Array.isArray(document.data)
    ? document.data as Record<string, unknown>
    : {};

  const layout = pdfLayoutDocumentSchema.safeParse(document.editableLayout);
  if (layout.success) {
    const issues = pdfLayoutBlockingIssues(layout.data);
    if (issues.length) throw new Error(issues.join(". "));
  }
  const source = layout.success
    ? await prisma.fileAsset.findFirstOrThrow({ where: { id: layout.data.sourceFileId, tenantId: job.tenantId, deletedAt: null } })
    : null;
  const pdf = layout.success && source
    ? await buildPdfFromLayout({ bytes: await getObjectResilient(source.storageKey), layout: layout.data })
    : document.editableHtml
      ? await buildGeneratedDocumentPdfFromHtml({
        title: document.type.replaceAll("_", " ").toUpperCase(),
        number: document.number,
        tenantName: tenant.name,
        html: document.editableHtml,
      })
      : await buildGeneratedDocumentPdf({
        title: document.type.replaceAll("_", " ").toUpperCase(),
        number: document.number,
        tenantName: tenant.name,
        body: [
          `This ${document.type.replaceAll("_", " ")} has been generated from the live production records for ${tenant.name}.`,
          `Record: ${document.recordType} / ${document.recordId}.`,
          ...Object.entries(data).map(([key, value]) => `${key}: ${String(value)}`),
          "This document should be reviewed and approved by an authorized builder administrator before issue.",
        ],
      });

  const key = generatedDocumentStorageKey(job.tenantId, document.id);
  const stored = await putGeneratedObject(key, pdf, "application/pdf");

  const file = await prisma.fileAsset.create({
    data: {
      tenantId: job.tenantId,
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
      uploadedById: document.createdById,
    },
  });

  await prisma.generatedDocument.update({
    where: { id: document.id },
    data: { fileAssetId: file.id, status: "GENERATED" },
  });
}

new Worker<DocumentJob>(
  "document.generate",
  async (job) => {
    await processDocument(job.data);
  },
  { connection: connection as never, concurrency: 4 },
);

console.log("Document worker listening on document.generate");

function documentTypeForLetter(type: string) {
  if (type.toLowerCase().includes("transfer")) return "TRANSFER_LETTER";
  if (type.toLowerCase().includes("registry")) return "OTHER";
  return "ALLOTMENT_LETTER";
}
