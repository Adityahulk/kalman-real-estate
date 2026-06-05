CREATE TABLE "GeneratedDocumentRevision" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "revisionNo" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "baseFileId" TEXT NOT NULL,
  "outputFileId" TEXT,
  "operations" JSONB NOT NULL DEFAULT '[]',
  "pageCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GeneratedDocumentRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedDocumentRevision_tenantId_documentId_revisionNo_key"
  ON "GeneratedDocumentRevision"("tenantId", "documentId", "revisionNo");

CREATE INDEX "GeneratedDocumentRevision_tenantId_documentId_idx"
  ON "GeneratedDocumentRevision"("tenantId", "documentId");

ALTER TABLE "GeneratedDocumentRevision"
  ADD CONSTRAINT "GeneratedDocumentRevision_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "GeneratedDocument"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
