-- Additive-only registry links. Existing legal files remain unchanged and are resolved at runtime.
ALTER TABLE "RegistryRecord"
  ADD COLUMN "registeredOwnerId" TEXT,
  ADD COLUMN "fileAssetId" TEXT,
  ADD COLUMN "createdById" TEXT;

CREATE INDEX "RegistryRecord_tenantId_registeredOwnerId_idx"
  ON "RegistryRecord"("tenantId", "registeredOwnerId");

CREATE INDEX "RegistryRecord_tenantId_fileAssetId_idx"
  ON "RegistryRecord"("tenantId", "fileAssetId");
