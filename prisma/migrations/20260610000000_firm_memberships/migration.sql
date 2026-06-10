ALTER TABLE "Tenant"
ADD COLUMN "logoDataUrl" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "authorizedPersons" JSONB,
ADD COLUMN "editKeyHash" TEXT;

CREATE TABLE "UserFirmMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserFirmMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFirmMembership_userId_tenantId_key" ON "UserFirmMembership"("userId", "tenantId");
CREATE INDEX "UserFirmMembership_tenantId_idx" ON "UserFirmMembership"("tenantId");

ALTER TABLE "UserFirmMembership"
ADD CONSTRAINT "UserFirmMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFirmMembership"
ADD CONSTRAINT "UserFirmMembership_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserFirmMembership" ("id", "userId", "tenantId", "role", "updatedAt")
SELECT 'membership-' || "id", "id", "tenantId", "role", CURRENT_TIMESTAMP
FROM "User"
WHERE "tenantId" IS NOT NULL
ON CONFLICT ("userId", "tenantId") DO NOTHING;
