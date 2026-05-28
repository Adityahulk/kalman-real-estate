CREATE TYPE "RealEstateDocumentType" AS ENUM (
  'ALLOTMENT_LETTER',
  'TRANSFER_LETTER',
  'PAN_CARD',
  'AADHAAR_CARD',
  'REGISTRY_RECEIPT',
  'REGISTRY_DEED',
  'PAYMENT_RECEIPT',
  'KYC',
  'AGREEMENT',
  'NOC',
  'OTHER'
);

ALTER TABLE "FileAsset"
  ADD COLUMN "documentType" "RealEstateDocumentType",
  ADD COLUMN "documentNo" TEXT,
  ADD COLUMN "documentDate" TIMESTAMP(3),
  ADD COLUMN "notes" TEXT;

CREATE INDEX "FileAsset_tenantId_documentType_idx" ON "FileAsset"("tenantId", "documentType");
