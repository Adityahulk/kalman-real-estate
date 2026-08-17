CREATE TYPE "CrmLeadStatus" AS ENUM (
  'NEW', 'CONTACTED', 'QUALIFIED', 'INTERESTED', 'FOLLOW_UP_REQUIRED',
  'VISIT_PROPOSED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'NEGOTIATION',
  'BOOKING_PENDING', 'BOOKED', 'CUSTOMER', 'NOT_INTERESTED',
  'FUTURE_PROSPECT', 'LOST', 'INVALID'
);

CREATE TYPE "CrmLeadPotential" AS ENUM ('COLD', 'WARM', 'HOT', 'VERY_HOT');
CREATE TYPE "CrmActivityType" AS ENUM (
  'LEAD_CREATED', 'INCOMING_CALL', 'OUTGOING_CALL', 'NOTE', 'STATUS_CHANGED',
  'POTENTIAL_CHANGED', 'ASSIGNED', 'FOLLOW_UP_CREATED', 'FOLLOW_UP_COMPLETED',
  'VISIT_PROPOSED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'VISIT_CANCELLED',
  'MESSAGE_OPENED', 'FEEDBACK_RECEIVED', 'BOOKING_CREATED', 'CUSTOMER_CONVERTED',
  'MERGED', 'TICKET_CREATED', 'TICKET_UPDATED'
);
CREATE TYPE "CrmFollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'OVERDUE');
CREATE TYPE "CrmVisitStatus" AS ENUM ('PROPOSED', 'SCHEDULED', 'CONFIRMED', 'VISITED', 'DID_NOT_VISIT', 'RESCHEDULED', 'CANCELLED');
CREATE TYPE "CrmBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "CrmTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TABLE "CrmSequence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmLeadSource" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmLeadSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmCampaign" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceId" TEXT,
  "projectId" TEXT,
  "spendInr" DECIMAL(14,2),
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmLead" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadCode" TEXT NOT NULL,
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
  "sourceId" TEXT,
  "campaignId" TEXT,
  "firstEnquiryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',
  "potential" "CrmLeadPotential" NOT NULL DEFAULT 'COLD',
  "score" INTEGER NOT NULL DEFAULT 0,
  "interestedProjectId" TEXT,
  "propertyType" TEXT,
  "interestedProperty" TEXT,
  "budgetMinInr" DECIMAL(14,2),
  "budgetMaxInr" DECIMAL(14,2),
  "purchaseTimeline" TEXT,
  "purpose" TEXT,
  "previousWork" TEXT,
  "existingCustomer" BOOLEAN NOT NULL DEFAULT false,
  "previousInteraction" TEXT,
  "preferredLanguage" TEXT,
  "preferredContactMethod" TEXT,
  "assignedCallerId" TEXT,
  "assignedSalespersonId" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "lastContactAt" TIMESTAMP(3),
  "notes" TEXT,
  "tags" JSONB,
  "qualification" JSONB,
  "customFields" JSONB,
  "referredByLeadId" TEXT,
  "consentWhatsApp" BOOLEAN NOT NULL DEFAULT false,
  "consentSms" BOOLEAN NOT NULL DEFAULT false,
  "consentEmail" BOOLEAN NOT NULL DEFAULT false,
  "convertedOwnerId" TEXT,
  "createdById" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "archivedById" TEXT,
  "archiveReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmLeadAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "assignmentType" TEXT NOT NULL,
  "previousUserId" TEXT,
  "assignedUserId" TEXT,
  "reason" TEXT,
  "assignedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmLeadAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" "CrmActivityType" NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "outcome" TEXT,
  "durationSeconds" INTEGER,
  "metadata" JSONB,
  "actorUserId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmFollowUp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "reason" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "assignedToId" TEXT,
  "status" "CrmFollowUpStatus" NOT NULL DEFAULT 'PENDING',
  "outcome" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedById" TEXT,
  "rescheduledFromId" TEXT,
  "escalationLevel" INTEGER NOT NULL DEFAULT 0,
  "lastReminderAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmVisit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "visitCode" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "visitorCount" INTEGER NOT NULL DEFAULT 1,
  "preferredSalespersonId" TEXT,
  "assignedSalespersonId" TEXT,
  "pickupRequired" BOOLEAN NOT NULL DEFAULT false,
  "specialRequirements" TEXT,
  "status" "CrmVisitStatus" NOT NULL DEFAULT 'SCHEDULED',
  "checkedInAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "customerResponse" TEXT,
  "propertiesShown" JSONB,
  "propertiesLiked" JSONB,
  "budgetConfirmedInr" DECIMAL(14,2),
  "objections" TEXT,
  "purchaseProbability" INTEGER,
  "customerNextAction" TEXT,
  "salespersonNextAction" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "lastReminderAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmFeedback" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "visitId" TEXT,
  "projectId" TEXT,
  "rating" INTEGER NOT NULL,
  "comments" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmBooking" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "bookingCode" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "plotId" TEXT,
  "ownerId" TEXT,
  "amountInr" DECIMAL(14,2),
  "status" "CrmBookingStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmCommunicationTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmCommunicationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmAutomationRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "actions" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmTicket" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ticketCode" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "status" "CrmTicketStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmSequence_tenantId_key_key" ON "CrmSequence"("tenantId", "key");
CREATE UNIQUE INDEX "CrmLeadSource_tenantId_key_key" ON "CrmLeadSource"("tenantId", "key");
CREATE INDEX "CrmLeadSource_tenantId_active_idx" ON "CrmLeadSource"("tenantId", "active");
CREATE INDEX "CrmCampaign_tenantId_archivedAt_idx" ON "CrmCampaign"("tenantId", "archivedAt");
CREATE INDEX "CrmCampaign_tenantId_sourceId_idx" ON "CrmCampaign"("tenantId", "sourceId");
CREATE UNIQUE INDEX "CrmLead_tenantId_leadCode_key" ON "CrmLead"("tenantId", "leadCode");
CREATE INDEX "CrmLead_tenantId_primaryPhoneNormalized_idx" ON "CrmLead"("tenantId", "primaryPhoneNormalized");
CREATE INDEX "CrmLead_tenantId_alternatePhoneNormalized_idx" ON "CrmLead"("tenantId", "alternatePhoneNormalized");
CREATE INDEX "CrmLead_tenantId_whatsappPhoneNormalized_idx" ON "CrmLead"("tenantId", "whatsappPhoneNormalized");
CREATE INDEX "CrmLead_tenantId_email_idx" ON "CrmLead"("tenantId", "email");
CREATE INDEX "CrmLead_tenantId_status_archivedAt_idx" ON "CrmLead"("tenantId", "status", "archivedAt");
CREATE INDEX "CrmLead_tenantId_assignedCallerId_nextFollowUpAt_idx" ON "CrmLead"("tenantId", "assignedCallerId", "nextFollowUpAt");
CREATE INDEX "CrmLead_tenantId_assignedSalespersonId_nextFollowUpAt_idx" ON "CrmLead"("tenantId", "assignedSalespersonId", "nextFollowUpAt");
CREATE INDEX "CrmLead_tenantId_sourceId_idx" ON "CrmLead"("tenantId", "sourceId");
CREATE INDEX "CrmLead_tenantId_interestedProjectId_idx" ON "CrmLead"("tenantId", "interestedProjectId");
CREATE INDEX "CrmLeadAssignment_tenantId_leadId_createdAt_idx" ON "CrmLeadAssignment"("tenantId", "leadId", "createdAt");
CREATE INDEX "CrmLeadAssignment_tenantId_assignedUserId_idx" ON "CrmLeadAssignment"("tenantId", "assignedUserId");
CREATE INDEX "CrmActivity_tenantId_leadId_occurredAt_idx" ON "CrmActivity"("tenantId", "leadId", "occurredAt");
CREATE INDEX "CrmActivity_tenantId_type_occurredAt_idx" ON "CrmActivity"("tenantId", "type", "occurredAt");
CREATE INDEX "CrmFollowUp_tenantId_status_dueAt_idx" ON "CrmFollowUp"("tenantId", "status", "dueAt");
CREATE INDEX "CrmFollowUp_tenantId_assignedToId_status_dueAt_idx" ON "CrmFollowUp"("tenantId", "assignedToId", "status", "dueAt");
CREATE INDEX "CrmFollowUp_tenantId_leadId_createdAt_idx" ON "CrmFollowUp"("tenantId", "leadId", "createdAt");
CREATE UNIQUE INDEX "CrmVisit_tenantId_visitCode_key" ON "CrmVisit"("tenantId", "visitCode");
CREATE INDEX "CrmVisit_tenantId_status_scheduledAt_idx" ON "CrmVisit"("tenantId", "status", "scheduledAt");
CREATE INDEX "CrmVisit_tenantId_assignedSalespersonId_scheduledAt_idx" ON "CrmVisit"("tenantId", "assignedSalespersonId", "scheduledAt");
CREATE INDEX "CrmVisit_tenantId_leadId_createdAt_idx" ON "CrmVisit"("tenantId", "leadId", "createdAt");
CREATE INDEX "CrmFeedback_tenantId_leadId_createdAt_idx" ON "CrmFeedback"("tenantId", "leadId", "createdAt");
CREATE INDEX "CrmFeedback_tenantId_visitId_idx" ON "CrmFeedback"("tenantId", "visitId");
CREATE UNIQUE INDEX "CrmBooking_tenantId_bookingCode_key" ON "CrmBooking"("tenantId", "bookingCode");
CREATE INDEX "CrmBooking_tenantId_leadId_idx" ON "CrmBooking"("tenantId", "leadId");
CREATE INDEX "CrmBooking_tenantId_projectId_status_idx" ON "CrmBooking"("tenantId", "projectId", "status");
CREATE INDEX "CrmBooking_tenantId_plotId_idx" ON "CrmBooking"("tenantId", "plotId");
CREATE UNIQUE INDEX "CrmCommunicationTemplate_tenantId_key_key" ON "CrmCommunicationTemplate"("tenantId", "key");
CREATE INDEX "CrmCommunicationTemplate_tenantId_channel_active_idx" ON "CrmCommunicationTemplate"("tenantId", "channel", "active");
CREATE INDEX "CrmAutomationRule_tenantId_active_idx" ON "CrmAutomationRule"("tenantId", "active");
CREATE UNIQUE INDEX "CrmTicket_tenantId_ticketCode_key" ON "CrmTicket"("tenantId", "ticketCode");
CREATE INDEX "CrmTicket_tenantId_status_createdAt_idx" ON "CrmTicket"("tenantId", "status", "createdAt");
CREATE INDEX "CrmTicket_tenantId_leadId_createdAt_idx" ON "CrmTicket"("tenantId", "leadId", "createdAt");
