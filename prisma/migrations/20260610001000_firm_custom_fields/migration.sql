ALTER TABLE "Tenant"
ADD COLUMN "customFields" JSONB;

CREATE TABLE "FirmCustomField" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FirmCustomField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FirmCustomField_ownerUserId_key_key" ON "FirmCustomField"("ownerUserId", "key");
CREATE INDEX "FirmCustomField_ownerUserId_idx" ON "FirmCustomField"("ownerUserId");

ALTER TABLE "FirmCustomField"
ADD CONSTRAINT "FirmCustomField_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
