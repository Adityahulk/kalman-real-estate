-- Liaison / government approvals with version history + expiry tracking. Additive: new table only.

CREATE TABLE "ApprovalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "authority" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersededById" TEXT,
    "fileAssetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApprovalDocument_tenantId_projectId_type_idx" ON "ApprovalDocument"("tenantId", "projectId", "type");
CREATE INDEX "ApprovalDocument_tenantId_status_expiresAt_idx" ON "ApprovalDocument"("tenantId", "status", "expiresAt");

ALTER TABLE "ApprovalDocument" ADD CONSTRAINT "ApprovalDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
