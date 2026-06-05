CREATE TYPE "FileStorageProvider" AS ENUM ('S3', 'LOCAL');

ALTER TABLE "FileAsset"
  ADD COLUMN "storageProvider" "FileStorageProvider" NOT NULL DEFAULT 'S3',
  ADD COLUMN "fallbackStorageKey" TEXT;

UPDATE "FileAsset"
SET "storageProvider" = 'LOCAL'
WHERE "storageKey" LIKE 'local/%';
