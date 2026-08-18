-- A person is stored once as a master contact. CrmLead remains the project-specific opportunity.
CREATE TABLE "CrmContact" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contactCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "primaryPhone" TEXT NOT NULL,
  "primaryPhoneNormalized" TEXT NOT NULL,
  "alternatePhone" TEXT,
  "alternatePhoneNormalized" TEXT,
  "whatsappPhone" TEXT,
  "whatsappPhoneNormalized" TEXT,
  "email" TEXT,
  "city" TEXT,
  "area" TEXT,
  "clientType" TEXT,
  "preferredLanguage" TEXT,
  "preferredContactMethod" TEXT,
  "existingCustomer" BOOLEAN NOT NULL DEFAULT false,
  "previousWork" TEXT,
  "previousInteraction" TEXT,
  "notes" TEXT,
  "tags" JSONB,
  "customFields" JSONB,
  "convertedOwnerId" TEXT,
  "createdById" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmContact_tenantId_contactCode_key" ON "CrmContact"("tenantId", "contactCode");
CREATE INDEX "CrmContact_tenantId_primaryPhoneNormalized_idx" ON "CrmContact"("tenantId", "primaryPhoneNormalized");
CREATE INDEX "CrmContact_tenantId_alternatePhoneNormalized_idx" ON "CrmContact"("tenantId", "alternatePhoneNormalized");
CREATE INDEX "CrmContact_tenantId_whatsappPhoneNormalized_idx" ON "CrmContact"("tenantId", "whatsappPhoneNormalized");
CREATE INDEX "CrmContact_tenantId_email_idx" ON "CrmContact"("tenantId", "email");
CREATE INDEX "CrmContact_tenantId_archivedAt_idx" ON "CrmContact"("tenantId", "archivedAt");

ALTER TABLE "CrmLead"
  ADD COLUMN "contactId" TEXT,
  ADD COLUMN "priceDiscussedInr" DECIMAL(14,2),
  ADD COLUMN "offersDiscounts" TEXT,
  ADD COLUMN "paymentPreference" TEXT,
  ADD COLUMN "negotiationStatus" TEXT,
  ADD COLUMN "mainObjections" TEXT,
  ADD COLUMN "competitorComparison" TEXT,
  ADD COLUMN "requestedInformation" TEXT;

-- Existing CRM rows pre-date master contacts. They were already deduplicated by phone/email,
-- so each can be promoted without losing or rewriting any opportunity history.
INSERT INTO "CrmContact" (
  "id", "tenantId", "contactCode", "name", "primaryPhone", "primaryPhoneNormalized",
  "alternatePhone", "alternatePhoneNormalized", "whatsappPhone", "whatsappPhoneNormalized",
  "email", "city", "area", "preferredLanguage", "preferredContactMethod", "existingCustomer",
  "previousWork", "previousInteraction", "notes", "tags", "customFields", "convertedOwnerId",
  "createdById", "archivedAt", "createdAt", "updatedAt"
)
SELECT
  'contact_' || "id", "tenantId", 'CONTACT-' || "leadCode", "name", "primaryPhone", "primaryPhoneNormalized",
  "alternatePhone", "alternatePhoneNormalized", "whatsappPhone", "whatsappPhoneNormalized",
  "email", "city", "area", "preferredLanguage", "preferredContactMethod", "existingCustomer",
  "previousWork", "previousInteraction", "notes", "tags", "customFields", "convertedOwnerId",
  "createdById", "archivedAt", "createdAt", "updatedAt"
FROM "CrmLead";

UPDATE "CrmLead" SET "contactId" = 'contact_' || "id" WHERE "contactId" IS NULL;
ALTER TABLE "CrmLead" ALTER COLUMN "contactId" SET NOT NULL;
CREATE INDEX "CrmLead_tenantId_contactId_archivedAt_idx" ON "CrmLead"("tenantId", "contactId", "archivedAt");

ALTER TABLE "CrmLeadAssignment" ADD COLUMN "projectId" TEXT;
ALTER TABLE "CrmActivity" ADD COLUMN "projectId" TEXT;
ALTER TABLE "CrmFollowUp" ADD COLUMN "projectId" TEXT;
ALTER TABLE "CrmTicket" ADD COLUMN "projectId" TEXT;

UPDATE "CrmLeadAssignment" a SET "projectId" = l."interestedProjectId" FROM "CrmLead" l WHERE a."leadId" = l."id";
UPDATE "CrmActivity" a SET "projectId" = l."interestedProjectId" FROM "CrmLead" l WHERE a."leadId" = l."id";
UPDATE "CrmFollowUp" f SET "projectId" = l."interestedProjectId" FROM "CrmLead" l WHERE f."leadId" = l."id";
UPDATE "CrmTicket" t SET "projectId" = l."interestedProjectId" FROM "CrmLead" l WHERE t."leadId" = l."id";

CREATE INDEX "CrmLeadAssignment_tenantId_projectId_createdAt_idx" ON "CrmLeadAssignment"("tenantId", "projectId", "createdAt");
CREATE INDEX "CrmActivity_tenantId_projectId_occurredAt_idx" ON "CrmActivity"("tenantId", "projectId", "occurredAt");
CREATE INDEX "CrmFollowUp_tenantId_projectId_dueAt_idx" ON "CrmFollowUp"("tenantId", "projectId", "dueAt");
CREATE INDEX "CrmTicket_tenantId_projectId_createdAt_idx" ON "CrmTicket"("tenantId", "projectId", "createdAt");

ALTER TABLE "CrmVisit"
  ADD COLUMN "visitPurpose" TEXT,
  ADD COLUMN "propertyToShow" TEXT,
  ADD COLUMN "customerDisliked" JSONB,
  ADD COLUMN "revisedRequirement" TEXT;
