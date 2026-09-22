CREATE TABLE "FileShareBundle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "fileIds" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileShareBundle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FileShareBundle_tenantId_expiresAt_idx"
ON "FileShareBundle"("tenantId", "expiresAt");

CREATE INDEX "FileShareBundle_expiresAt_idx"
ON "FileShareBundle"("expiresAt");

ALTER TABLE "FileShareBundle"
ADD CONSTRAINT "FileShareBundle_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FileShareBundle"
ADD CONSTRAINT "FileShareBundle_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
