ALTER TABLE "Plot"
  ADD COLUMN "areaSqYards" DECIMAL(12,2),
  ADD COLUMN "primeLocation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "boundaries" JSONB;

ALTER TABLE "OwnershipRecord"
  ADD COLUMN "paymentMode" TEXT,
  ADD COLUMN "extraDetails" JSONB;

UPDATE "Plot"
SET "areaSqYards" = ROUND("areaSqft" / 9, 2)
WHERE "areaSqft" IS NOT NULL AND "areaSqYards" IS NULL;
