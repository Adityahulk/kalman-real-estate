import { FileVisibility, PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { generatedDocumentStorageKey, putGeneratedObject } from "@/server/storage";
import { buildGeneratedDocumentPdf } from "@/server/services/document-pdf";

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

  const body = [
    `This ${document.type.replaceAll("_", " ")} has been generated from the live production records for ${tenant.name}.`,
    `Record: ${document.recordType} / ${document.recordId}.`,
    ...Object.entries(data).map(([key, value]) => `${key}: ${String(value)}`),
    "This document should be reviewed and approved by an authorized builder administrator before issue.",
  ];

  const pdf = await buildGeneratedDocumentPdf({
    title: document.type.replaceAll("_", " ").toUpperCase(),
    number: document.number,
    tenantName: tenant.name,
    body,
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
      documentType: document.type.toLowerCase().includes("transfer") ? "TRANSFER_LETTER" : "ALLOTMENT_LETTER",
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
