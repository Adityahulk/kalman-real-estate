ALTER TABLE "MarketingTask" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "MarketingTask" ADD COLUMN "assignee" TEXT;
ALTER TABLE "MarketingTask" ADD COLUMN "links" JSONB;
