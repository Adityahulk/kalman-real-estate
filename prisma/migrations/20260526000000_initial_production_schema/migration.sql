-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'BUILDER_OWNER', 'BUILDER_ADMIN', 'SITE_ENGINEER', 'FINANCE_MANAGER', 'MARKETING_HEAD', 'VIDEOGRAPHER', 'EDITOR', 'CONTRACTOR', 'PLOT_OWNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'SHARED');

-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('COMPANY_OWNED', 'ALLOTTED', 'TRANSFERRED', 'REGISTRY_IN_PROGRESS', 'REGISTERED', 'HOLD');

-- CreateEnum
CREATE TYPE "OwnershipKind" AS ENUM ('COMPANY_INVENTORY', 'ALLOTMENT', 'TRANSFER', 'REGISTRY');

-- CreateEnum
CREATE TYPE "CadFormat" AS ENUM ('DWG', 'DXF', 'VECTOR_PDF');

-- CreateEnum
CREATE TYPE "CadStatus" AS ENUM ('UPLOADED', 'CONVERTING', 'PARSING', 'EXTRACTING', 'REVIEW_REQUIRED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "CadScope" AS ENUM ('PROJECT', 'PLOT', 'UNIT', 'FLOOR', 'ROOM', 'SITE_ASSET');

-- CreateEnum
CREATE TYPE "CadEntityType" AS ENUM ('PLOT', 'ROAD', 'BOUNDARY', 'UTILITY', 'PARK', 'GATE', 'CLUBHOUSE', 'DRAINAGE', 'ROOM', 'BATHROOM', 'KITCHEN', 'STAIRCASE', 'PARKING', 'GARDEN', 'WALL', 'DOOR', 'WINDOW', 'ELECTRICAL_POINT', 'PLUMBING_LINE', 'STRUCTURE', 'FINISHING_ZONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('ADMIN_ONLY', 'TEAM', 'OWNER_VISIBLE', 'SHARED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "MarketingTaskStatus" AS ENUM ('TODO', 'SHOOT_ASSIGNED', 'RAW_UPLOADED', 'EDIT_ASSIGNED', 'DRAFT_UPLOADED', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'UPLOAD', 'REVIEW', 'PUBLISH', 'APPROVE', 'REJECT', 'TRANSFER', 'ALLOT', 'REGISTRY_UPDATE', 'PROGRESS_UPDATE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoFileId" TEXT,
    "letterhead" JSONB,
    "crmUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "budgetInr" DECIMAL(14,2),
    "spentInr" DECIMAL(14,2),
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "handoverAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "OwnerType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "kyc" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "blockId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "areaSqft" DECIMAL(12,2),
    "priceInr" DECIMAL(14,2),
    "status" "PlotStatus" NOT NULL DEFAULT 'COMPANY_OWNED',
    "facing" TEXT,
    "geometry" JSONB,
    "currentOwnerId" TEXT,
    "ownerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "ownerId" TEXT,
    "kind" "OwnershipKind" NOT NULL,
    "amountInr" DECIMAL(14,2),
    "sharePct" DECIMAL(5,2),
    "documentId" TEXT,
    "notes" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnershipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistryRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "registryNo" TEXT,
    "registryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "parentType" "CadScope" NOT NULL,
    "parentId" TEXT NOT NULL,
    "format" "CadFormat" NOT NULL,
    "status" "CadStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "processingLog" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadScene" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cadFileId" TEXT NOT NULL,
    "scope" "CadScope" NOT NULL,
    "parentId" TEXT NOT NULL,
    "bounds" JSONB NOT NULL,
    "units" TEXT NOT NULL DEFAULT 'feet',
    "sceneJson" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadLayer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CadLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "layerId" TEXT,
    "type" "CadEntityType" NOT NULL,
    "label" TEXT,
    "confidence" DECIMAL(5,2) NOT NULL,
    "geometry" JSONB NOT NULL,
    "measurements" JSONB,
    "sourceHandle" TEXT,
    "sourceLayer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadReviewIssue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cadFileId" TEXT NOT NULL,
    "entityId" TEXT,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'MEDIUM',
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadReviewIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cadFileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CadStatus" NOT NULL,
    "comparison" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpatialLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cadEntityId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "linkConfidence" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpatialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'ADMIN_ONLY',
    "ownerType" TEXT,
    "ownerId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "number" TEXT,
    "data" JSONB NOT NULL,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contractorId" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "geometry" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plotId" TEXT,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "assignedToId" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressUpdate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "progressPct" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "photoFileIds" JSONB,
    "visibleToOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "status" "MarketingTaskStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "createdById" TEXT,
    "videographerId" TEXT,
    "editorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timecode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requestedById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "plannedQty" DECIMAL(14,3) NOT NULL,
    "plannedRateInr" DECIMAL(14,2) NOT NULL,
    "cadQuantity" DECIMAL(14,3),
    "consumedQty" DECIMAL(14,3),
    "category" TEXT NOT NULL,
    "cadEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BOQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT,
    "projectId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalInr" DECIMAL(14,2) NOT NULL,
    "lineItems" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT,
    "projectId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "totalInr" DECIMAL(14,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "fileAssetId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountInr" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "queue" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex
CREATE INDEX "Phase_tenantId_projectId_idx" ON "Phase"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Block_tenantId_projectId_idx" ON "Block"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Owner_tenantId_phone_idx" ON "Owner"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Plot_tenantId_currentOwnerId_idx" ON "Plot"("tenantId", "currentOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Plot_tenantId_projectId_code_key" ON "Plot"("tenantId", "projectId", "code");

-- CreateIndex
CREATE INDEX "OwnershipRecord_tenantId_plotId_effectiveAt_idx" ON "OwnershipRecord"("tenantId", "plotId", "effectiveAt");

-- CreateIndex
CREATE INDEX "RegistryRecord_tenantId_plotId_idx" ON "RegistryRecord"("tenantId", "plotId");

-- CreateIndex
CREATE INDEX "CadFile_tenantId_parentType_parentId_idx" ON "CadFile"("tenantId", "parentType", "parentId");

-- CreateIndex
CREATE INDEX "CadScene_tenantId_scope_parentId_idx" ON "CadScene"("tenantId", "scope", "parentId");

-- CreateIndex
CREATE INDEX "CadLayer_tenantId_sceneId_idx" ON "CadLayer"("tenantId", "sceneId");

-- CreateIndex
CREATE INDEX "CadEntity_tenantId_sceneId_type_idx" ON "CadEntity"("tenantId", "sceneId", "type");

-- CreateIndex
CREATE INDEX "CadReviewIssue_tenantId_cadFileId_resolved_idx" ON "CadReviewIssue"("tenantId", "cadFileId", "resolved");

-- CreateIndex
CREATE INDEX "CadVersion_tenantId_cadFileId_idx" ON "CadVersion"("tenantId", "cadFileId");

-- CreateIndex
CREATE UNIQUE INDEX "CadVersion_cadFileId_version_key" ON "CadVersion"("cadFileId", "version");

-- CreateIndex
CREATE INDEX "SpatialLink_tenantId_recordType_recordId_idx" ON "SpatialLink"("tenantId", "recordType", "recordId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_ownerType_ownerId_idx" ON "FileAsset"("tenantId", "ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_tenantId_recordType_recordId_idx" ON "GeneratedDocument"("tenantId", "recordType", "recordId");

-- CreateIndex
CREATE INDEX "SiteAsset_tenantId_projectId_type_idx" ON "SiteAsset"("tenantId", "projectId", "type");

-- CreateIndex
CREATE INDEX "ChecklistItem_tenantId_parentType_parentId_idx" ON "ChecklistItem"("tenantId", "parentType", "parentId");

-- CreateIndex
CREATE INDEX "ProgressUpdate_tenantId_parentType_parentId_createdAt_idx" ON "ProgressUpdate"("tenantId", "parentType", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_tenantId_parentType_parentId_status_idx" ON "Issue"("tenantId", "parentType", "parentId", "status");

-- CreateIndex
CREATE INDEX "MarketingTask_tenantId_projectId_status_idx" ON "MarketingTask"("tenantId", "projectId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_tenantId_taskId_idx" ON "MediaAsset"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "ReviewComment_tenantId_taskId_idx" ON "ReviewComment"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "Approval_tenantId_recordType_recordId_status_idx" ON "Approval"("tenantId", "recordType", "recordId", "status");

-- CreateIndex
CREATE INDEX "Vendor_tenantId_type_idx" ON "Vendor"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Contractor_tenantId_trade_idx" ON "Contractor"("tenantId", "trade");

-- CreateIndex
CREATE UNIQUE INDEX "BOQItem_tenantId_projectId_code_key" ON "BOQItem"("tenantId", "projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_number_key" ON "PurchaseOrder"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON "Invoice"("tenantId", "number");

-- CreateIndex
CREATE INDEX "Payment_tenantId_invoiceId_idx" ON "Payment"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "CostInsight_tenantId_projectId_severity_idx" ON "CostInsight"("tenantId", "projectId", "severity");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_entityType_entityId_createdAt_idx" ON "AuditEvent"("tenantId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_status_idx" ON "Notification"("tenantId", "userId", "status");

-- CreateIndex
CREATE INDEX "BackgroundJob_tenantId_queue_status_idx" ON "BackgroundJob"("tenantId", "queue", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistryRecord" ADD CONSTRAINT "RegistryRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadFile" ADD CONSTRAINT "CadFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadScene" ADD CONSTRAINT "CadScene_cadFileId_fkey" FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadLayer" ADD CONSTRAINT "CadLayer_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "CadScene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadEntity" ADD CONSTRAINT "CadEntity_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "CadScene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadReviewIssue" ADD CONSTRAINT "CadReviewIssue_cadFileId_fkey" FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadVersion" ADD CONSTRAINT "CadVersion_cadFileId_fkey" FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpatialLink" ADD CONSTRAINT "SpatialLink_cadEntityId_fkey" FOREIGN KEY ("cadEntityId") REFERENCES "CadEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAsset" ADD CONSTRAINT "SiteAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingTask" ADD CONSTRAINT "MarketingTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MarketingTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MarketingTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

