ALTER TABLE "Project"
  ADD COLUMN "state" TEXT,
  ADD COLUMN "developmentLicenses" JSONB,
  ADD COLUMN "landAreaAcres" DECIMAL(14,4),
  ADD COLUMN "totalPlots" INTEGER;

ALTER TABLE "FileAsset"
  ADD COLUMN "categoryKey" TEXT;

CREATE TABLE "ProjectFileField" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'PROJECT_FILES',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectFileField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectFileField_tenantId_section_key_key"
  ON "ProjectFileField"("tenantId", "section", "key");
CREATE INDEX "ProjectFileField_tenantId_section_idx"
  ON "ProjectFileField"("tenantId", "section");
CREATE INDEX "FileAsset_tenantId_ownerType_ownerId_categoryKey_idx"
  ON "FileAsset"("tenantId", "ownerType", "ownerId", "categoryKey");

ALTER TABLE "ProjectFileField"
  ADD CONSTRAINT "ProjectFileField_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
