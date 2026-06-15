ALTER TABLE "DocumentTemplate"
  ADD COLUMN "editorMode" TEXT NOT NULL DEFAULT 'HTML',
  ADD COLUMN "analysisStatus" TEXT NOT NULL DEFAULT 'READY',
  ADD COLUMN "layoutData" JSONB,
  ADD COLUMN "analysisError" TEXT,
  ADD COLUMN "layoutVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "GeneratedDocument"
  ADD COLUMN "editableLayout" JSONB;
