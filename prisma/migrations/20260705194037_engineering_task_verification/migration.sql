-- Engineering task verification loop. Additive: new nullable columns on SiteAsset + one index.

ALTER TABLE "SiteAsset" ADD COLUMN "assignedToId" TEXT,
ADD COLUMN "priority" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "verifiedById" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verificationNotes" TEXT;

CREATE INDEX "SiteAsset_tenantId_assignedToId_idx" ON "SiteAsset"("tenantId", "assignedToId");
