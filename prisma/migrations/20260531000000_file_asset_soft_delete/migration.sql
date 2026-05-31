ALTER TABLE "FileAsset"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "deleteReason" TEXT;

CREATE INDEX "FileAsset_tenantId_deletedAt_idx" ON "FileAsset"("tenantId", "deletedAt");
