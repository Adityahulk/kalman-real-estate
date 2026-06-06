ALTER TYPE "CadStatus" ADD VALUE IF NOT EXISTS 'ANALYZING' AFTER 'PARSING';
ALTER TYPE "CadStatus" ADD VALUE IF NOT EXISTS 'SETUP_REQUIRED' AFTER 'ANALYZING';
ALTER TYPE "CadStatus" ADD VALUE IF NOT EXISTS 'CALIBRATION_REQUIRED' AFTER 'EXTRACTING';

ALTER TABLE "Plot"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "SiteAsset"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "CadEntity"
  ADD COLUMN "validation" JSONB;

ALTER TABLE "CadReviewIssue"
  ADD COLUMN "blocking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "CadAnalysis" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cadFileId" TEXT NOT NULL,
  "discipline" TEXT NOT NULL DEFAULT 'AUTO',
  "sourceKind" TEXT,
  "pageNumber" INTEGER NOT NULL DEFAULT 1,
  "proposedRegion" JSONB,
  "confirmedRegion" JSONB,
  "excludedRegions" JSONB,
  "expectedCounts" JSONB,
  "scaleCalibration" JSONB,
  "inspection" JSONB,
  "rawArtifactKey" TEXT,
  "previewArtifactKey" TEXT,
  "setupConfirmedAt" TIMESTAMP(3),
  "calibrationConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CadAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CadPublishBatch" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cadFileId" TEXT NOT NULL,
  "sceneId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "summary" JSONB,
  "publishedById" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rolledBackById" TEXT,
  "rolledBackAt" TIMESTAMP(3),
  "rollbackReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CadPublishBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SpatialLink" ADD COLUMN "publishBatchId" TEXT;

CREATE UNIQUE INDEX "CadAnalysis_cadFileId_key" ON "CadAnalysis"("cadFileId");
CREATE INDEX "CadAnalysis_tenantId_cadFileId_idx" ON "CadAnalysis"("tenantId", "cadFileId");
CREATE INDEX "CadPublishBatch_tenantId_cadFileId_publishedAt_idx" ON "CadPublishBatch"("tenantId", "cadFileId", "publishedAt");
CREATE INDEX "SpatialLink_tenantId_publishBatchId_idx" ON "SpatialLink"("tenantId", "publishBatchId");
CREATE INDEX "Plot_tenantId_projectId_archivedAt_idx" ON "Plot"("tenantId", "projectId", "archivedAt");
CREATE INDEX "SiteAsset_tenantId_projectId_archivedAt_idx" ON "SiteAsset"("tenantId", "projectId", "archivedAt");

ALTER TABLE "CadAnalysis"
  ADD CONSTRAINT "CadAnalysis_cadFileId_fkey"
  FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CadPublishBatch"
  ADD CONSTRAINT "CadPublishBatch_cadFileId_fkey"
  FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CadPublishBatch"
  ADD CONSTRAINT "CadPublishBatch_sceneId_fkey"
  FOREIGN KEY ("sceneId") REFERENCES "CadScene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SpatialLink"
  ADD CONSTRAINT "SpatialLink_publishBatchId_fkey"
  FOREIGN KEY ("publishBatchId") REFERENCES "CadPublishBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
