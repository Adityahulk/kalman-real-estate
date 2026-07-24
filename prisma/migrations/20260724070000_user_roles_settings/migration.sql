CREATE TYPE "UserFieldType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT');

ALTER TABLE "User"
  ADD COLUMN "customRoleId" TEXT,
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "designationId" TEXT,
  ADD COLUMN "profileData" JSONB;

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Designation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomRole" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "baseRole" "Role" NOT NULL DEFAULT 'VIEWER',
  "permissions" JSONB NOT NULL,
  "departmentId" TEXT,
  "designationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserFieldDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "type" "UserFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserFieldDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_tenantId_name_key" ON "Department"("tenantId", "name");
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");
CREATE UNIQUE INDEX "Designation_departmentId_name_key" ON "Designation"("departmentId", "name");
CREATE INDEX "Designation_tenantId_idx" ON "Designation"("tenantId");
CREATE INDEX "Designation_departmentId_idx" ON "Designation"("departmentId");
CREATE UNIQUE INDEX "CustomRole_tenantId_name_key" ON "CustomRole"("tenantId", "name");
CREATE INDEX "CustomRole_tenantId_idx" ON "CustomRole"("tenantId");
CREATE INDEX "CustomRole_departmentId_idx" ON "CustomRole"("departmentId");
CREATE INDEX "CustomRole_designationId_idx" ON "CustomRole"("designationId");
CREATE UNIQUE INDEX "UserFieldDefinition_tenantId_key_key" ON "UserFieldDefinition"("tenantId", "key");
CREATE INDEX "UserFieldDefinition_tenantId_idx" ON "UserFieldDefinition"("tenantId");
CREATE INDEX "User_customRoleId_idx" ON "User"("customRoleId");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX "User_designationId_idx" ON "User"("designationId");

ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_designationId_fkey"
  FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserFieldDefinition" ADD CONSTRAINT "UserFieldDefinition_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey"
  FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_designationId_fkey"
  FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
