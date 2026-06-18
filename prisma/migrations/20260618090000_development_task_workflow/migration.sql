ALTER TABLE "SiteAsset"
  ADD COLUMN "totalArea" DECIMAL(14,2),
  ADD COLUMN "units" TEXT;

ALTER TABLE "ProgressUpdate"
  ADD COLUMN "quantityDone" DECIMAL(14,2),
  ADD COLUMN "recordedAt" TIMESTAMP(3);
