CREATE TABLE "CadOverlay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cadFileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "sourceHandle" TEXT,
    "geometry" JSONB,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadOverlay_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CadOverlay_tenantId_cadFileId_kind_idx"
ON "CadOverlay"("tenantId", "cadFileId", "kind");

ALTER TABLE "CadOverlay"
ADD CONSTRAINT "CadOverlay_cadFileId_fkey"
FOREIGN KEY ("cadFileId") REFERENCES "CadFile"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
