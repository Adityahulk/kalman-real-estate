CREATE TABLE "LetterFieldCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetterFieldCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LetterFieldDefinition" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "mapping" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetterFieldDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LetterFieldCategory_tenantId_key_key" ON "LetterFieldCategory"("tenantId", "key");
CREATE INDEX "LetterFieldCategory_tenantId_idx" ON "LetterFieldCategory"("tenantId");
CREATE UNIQUE INDEX "LetterFieldDefinition_categoryId_key_key" ON "LetterFieldDefinition"("categoryId", "key");
CREATE INDEX "LetterFieldDefinition_categoryId_idx" ON "LetterFieldDefinition"("categoryId");

ALTER TABLE "LetterFieldCategory" ADD CONSTRAINT "LetterFieldCategory_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetterFieldDefinition" ADD CONSTRAINT "LetterFieldDefinition_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "LetterFieldCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
