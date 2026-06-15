ALTER TABLE "ProjectFileField" ADD COLUMN "logoFileId" TEXT;
ALTER TABLE "Plot" ADD COLUMN "allottedBy" TEXT;
ALTER TABLE "Plot" ADD COLUMN "dimensions" TEXT;
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
