ALTER TABLE "Plot"
  ALTER COLUMN "primeLocation" DROP DEFAULT,
  ALTER COLUMN "primeLocation" DROP NOT NULL,
  ALTER COLUMN "primeLocation" TYPE TEXT
  USING CASE WHEN "primeLocation" = true THEN 'Prime location' ELSE NULL END;

ALTER TABLE "ProjectFileField"
  ADD COLUMN "parentId" TEXT;

CREATE INDEX "ProjectFileField_parentId_idx" ON "ProjectFileField"("parentId");

ALTER TABLE "ProjectFileField"
  ADD CONSTRAINT "ProjectFileField_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ProjectFileField"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "ProjectFileField"
SET "section" = 'PROJECT_MAPS'
WHERE "section" = 'CAD';

INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "createdAt", "updatedAt")
SELECT CONCAT('map-electrical-', "id"), "id", 'Electrical plans', 'electrical_plan', 'PROJECT_MAPS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;

INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "createdAt", "updatedAt")
SELECT CONCAT('map-water-', "id"), "id", 'Water sewage', 'water_sewage', 'PROJECT_MAPS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;
