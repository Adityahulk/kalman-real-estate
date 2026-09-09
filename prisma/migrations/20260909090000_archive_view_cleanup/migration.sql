CREATE TABLE "ArchiveDismissal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "archiveVersion" TIMESTAMP(3) NOT NULL,
    "clearedById" TEXT,
    "clearedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchiveDismissal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArchiveDismissal_tenantId_recordType_recordId_archiveVersion_key"
ON "ArchiveDismissal"("tenantId", "recordType", "recordId", "archiveVersion");
CREATE INDEX "ArchiveDismissal_tenantId_clearedAt_idx" ON "ArchiveDismissal"("tenantId", "clearedAt");

ALTER TABLE "ArchiveDismissal"
ADD CONSTRAINT "ArchiveDismissal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchiveDismissal"
ADD CONSTRAINT "ArchiveDismissal_clearedById_fkey" FOREIGN KEY ("clearedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
