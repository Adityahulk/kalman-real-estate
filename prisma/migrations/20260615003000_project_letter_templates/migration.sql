ALTER TABLE "DocumentTemplate" ADD COLUMN "projectId" TEXT;
ALTER TABLE "DocumentTemplate" ADD COLUMN "sourceFileId" TEXT;
ALTER TABLE "DocumentTemplate" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DocumentTemplate_tenantId_projectId_type_active_idx" ON "DocumentTemplate"("tenantId", "projectId", "type", "active");
