import "@/server/load-env";
import { PrismaClient, Role } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { generateCostInsights } from "@/server/services/ai";
import { createNotification } from "@/server/services/notifications";

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

type AiReportJob = {
  tenantId: string;
  projectId: string;
  reportType: string;
};

new Worker<AiReportJob>(
  "ai.report",
  async (job) => {
    const user = await prisma.user.findFirst({
      where: {
        tenantId: job.data.tenantId,
        role: { in: [Role.BUILDER_OWNER, Role.BUILDER_ADMIN, Role.FINANCE_MANAGER] },
      },
      orderBy: { createdAt: "asc" },
    });

    const context = {
      tenantId: job.data.tenantId,
      userId: user?.id ?? "system-ai-worker",
      role: user?.role ?? Role.BUILDER_ADMIN,
    };

    if (job.data.reportType === "cost-insights") {
      return generateCostInsights(context, { projectId: job.data.projectId });
    }

    const [project, issues, progress, insights] = await Promise.all([
      prisma.project.findFirstOrThrow({ where: { id: job.data.projectId, tenantId: job.data.tenantId } }),
      prisma.issue.findMany({ where: { tenantId: job.data.tenantId, status: "OPEN" }, take: 10, orderBy: { createdAt: "desc" } }),
      prisma.progressUpdate.findMany({ where: { tenantId: job.data.tenantId }, take: 20, orderBy: { createdAt: "desc" } }),
      prisma.costInsight.findMany({ where: { tenantId: job.data.tenantId, projectId: job.data.projectId, approved: false }, take: 10, orderBy: { createdAt: "desc" } }),
    ]);

    await createNotification(context, {
      title: "Weekly AI report prepared",
      body: `${project.name}: ${issues.length} open issues, ${progress.length} recent progress updates, ${insights.length} pending cost insights.`,
      data: { projectId: job.data.projectId, reportType: job.data.reportType },
    });

    return { projectId: project.id, openIssues: issues.length, recentProgress: progress.length, pendingInsights: insights.length };
  },
  { connection: connection as never, concurrency: 2 },
);

console.log("AI worker listening on ai.report");
