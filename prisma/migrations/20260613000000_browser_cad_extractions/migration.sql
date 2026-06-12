CREATE TYPE "CadExtractionStatus" AS ENUM (
  'CREATED',
  'UPLOADING',
  'VALIDATING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "CadExtractionRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cadFileId" TEXT NOT NULL,
  "parserEngine" TEXT NOT NULL,
  "parserVersion" TEXT NOT NULL,
  "sourceSha256" TEXT NOT NULL,
  "drawingUnits" TEXT,
  "bounds" JSONB,
  "expectedEntityCount" INTEGER NOT NULL,
  "expectedChunkCount" INTEGER NOT NULL,
  "receivedChunks" JSONB NOT NULL,
  "manifest" JSONB NOT NULL,
  "status" "CadExtractionStatus" NOT NULL DEFAULT 'CREATED',
  "warnings" JSONB,
  "errorMessage" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "CadExtractionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CadExtractionRun_tenantId_cadFileId_createdAt_idx"
  ON "CadExtractionRun"("tenantId", "cadFileId", "createdAt");

CREATE INDEX "CadExtractionRun_tenantId_status_idx"
  ON "CadExtractionRun"("tenantId", "status");

ALTER TABLE "CadExtractionRun"
  ADD CONSTRAINT "CadExtractionRun_cadFileId_fkey"
  FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
