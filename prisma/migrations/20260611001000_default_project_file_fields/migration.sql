INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "updatedAt")
SELECT 'default-registry-' || "id", "id", 'Registry', 'registry', 'PROJECT_FILES', CURRENT_TIMESTAMP FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;

INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "updatedAt")
SELECT 'default-rera-' || "id", "id", 'RERA', 'rera', 'PROJECT_FILES', CURRENT_TIMESTAMP FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;

INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "updatedAt")
SELECT 'default-noc-' || "id", "id", 'NOC', 'noc', 'PROJECT_FILES', CURRENT_TIMESTAMP FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;

INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "updatedAt")
SELECT 'default-license-' || "id", "id", 'License', 'license', 'PROJECT_FILES', CURRENT_TIMESTAMP FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;

INSERT INTO "ProjectFileField" ("id", "tenantId", "label", "key", "section", "updatedAt")
SELECT 'default-development-file-' || "id", "id", 'Development file', 'development_file', 'PROJECT_FILES', CURRENT_TIMESTAMP FROM "Tenant"
ON CONFLICT ("tenantId", "section", "key") DO NOTHING;
