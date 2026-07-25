ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

ALTER TABLE "FileAsset"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "previousFileId" TEXT;

ALTER TABLE "GeneratedDocument"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "OwnershipRecord"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "RegistryRecord"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "AuditEvent"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "ProgressUpdate"
  ADD COLUMN "videoFileIds" JSONB,
  ADD COLUMN "materialUsed" TEXT;

ALTER TABLE "SiteAsset"
  ADD COLUMN "lastReminderAt" TIMESTAMP(3);

ALTER TABLE "MarketingTask"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "archiveReason" TEXT;

CREATE INDEX "GeneratedDocument_tenantId_archivedAt_idx"
  ON "GeneratedDocument"("tenantId", "archivedAt");

CREATE INDEX "OwnershipRecord_tenantId_plotId_cancelledAt_idx"
  ON "OwnershipRecord"("tenantId", "plotId", "cancelledAt");

CREATE INDEX "RegistryRecord_tenantId_plotId_archivedAt_idx"
  ON "RegistryRecord"("tenantId", "plotId", "archivedAt");

CREATE INDEX "AuditEvent_tenantId_archivedAt_idx"
  ON "AuditEvent"("tenantId", "archivedAt");

CREATE INDEX "MarketingTask_tenantId_archivedAt_idx"
  ON "MarketingTask"("tenantId", "archivedAt");
