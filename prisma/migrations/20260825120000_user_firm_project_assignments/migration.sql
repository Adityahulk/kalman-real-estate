ALTER TABLE "UserFirmMembership"
ADD COLUMN "allProjects" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "UserProjectMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProjectMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProjectMembership_userId_projectId_key"
ON "UserProjectMembership"("userId", "projectId");

CREATE INDEX "UserProjectMembership_userId_tenantId_idx"
ON "UserProjectMembership"("userId", "tenantId");

CREATE INDEX "UserProjectMembership_tenantId_projectId_idx"
ON "UserProjectMembership"("tenantId", "projectId");

ALTER TABLE "UserProjectMembership"
ADD CONSTRAINT "UserProjectMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProjectMembership"
ADD CONSTRAINT "UserProjectMembership_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProjectMembership"
ADD CONSTRAINT "UserProjectMembership_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
