import { prisma } from "../db";
import { RequestContext } from "../api";

export async function getPlatformOverview(context: RequestContext) {
  const [tenant, projects, plots, cadFiles, documents, openIssues, marketingTasks, invoices, insights] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: context.tenantId } }),
      prisma.project.findMany({ where: { tenantId: context.tenantId }, orderBy: { updatedAt: "desc" }, take: 8 }),
      prisma.plot.groupBy({ by: ["status"], where: { tenantId: context.tenantId, archivedAt: null }, _count: true }),
      prisma.cadFile.groupBy({ by: ["status"], where: { tenantId: context.tenantId }, _count: true }),
      prisma.generatedDocument.count({ where: { tenantId: context.tenantId } }),
      prisma.issue.count({ where: { tenantId: context.tenantId, status: "OPEN" } }),
      prisma.marketingTask.groupBy({ by: ["status"], where: { tenantId: context.tenantId }, _count: true }),
      prisma.invoice.groupBy({ by: ["paymentStatus"], where: { tenantId: context.tenantId }, _count: true, _sum: { totalInr: true } }),
      prisma.costInsight.findMany({ where: { tenantId: context.tenantId, approved: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  return { tenant, projects, plotStatus: plots, cadStatus: cadFiles, documents, openIssues, marketingTasks, invoices, insights };
}
