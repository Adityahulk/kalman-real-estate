-- RBAC roles + allotment approval/signature workflow. All changes are additive:
-- new enum values, a new nullable unique column on User, and new nullable columns on GeneratedDocument.

-- AlterEnum: new audit actions
ALTER TYPE "AuditAction" ADD VALUE 'SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'SIGN';
ALTER TYPE "AuditAction" ADD VALUE 'ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE 'VERIFY';
ALTER TYPE "AuditAction" ADD VALUE 'RETURN';

-- AlterEnum: new document workflow statuses
ALTER TYPE "DocumentStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "DocumentStatus" ADD VALUE 'SENT_FOR_SIGNATURE';
ALTER TYPE "DocumentStatus" ADD VALUE 'SIGNED';

-- AlterEnum: new roles
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'ALLOTMENT_EXECUTIVE';
ALTER TYPE "Role" ADD VALUE 'APPROVING_AUTHORITY';
ALTER TYPE "Role" ADD VALUE 'AUTHORIZED_SIGNATORY';
ALTER TYPE "Role" ADD VALUE 'HEAD_ENGINEER';
ALTER TYPE "Role" ADD VALUE 'LIAISON_OFFICER';

-- AlterTable: username login support
ALTER TABLE "User" ADD COLUMN "loginId" TEXT;

-- AlterTable: allotment submission + signature capture
ALTER TABLE "GeneratedDocument" ADD COLUMN "submittedById" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "signedById" TEXT,
ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signedFileAssetId" TEXT,
ADD COLUMN "reviewNotes" TEXT;

-- CreateIndex: unique login IDs (NULLs allowed, so existing rows are unaffected)
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
