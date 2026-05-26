import { InsightSeverity } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import { RequestContext } from "../api";
import { enqueueAiReport } from "../jobs";
import { prisma } from "../db";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export const insightSchema = z.object({
  projectId: z.string(),
});

export async function generateCostInsights(context: RequestContext, input: z.infer<typeof insightSchema>) {
  const variances = await prisma.bOQItem.findMany({
    where: { tenantId: context.tenantId, projectId: input.projectId },
  });

  if (openai && variances.length) {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return JSON with an insights array. Each insight needs severity LOW/MEDIUM/HIGH/CRITICAL, title, explanation, and source." },
        { role: "user", content: JSON.stringify({ boq: variances.map((item) => ({ id: item.id, code: item.code, description: item.description, plannedQty: item.plannedQty.toString(), consumedQty: item.consumedQty?.toString(), rate: item.plannedRateInr.toString() })) }) },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message.content ?? "{\"insights\":[]}") as {
      insights?: Array<{ severity?: InsightSeverity; title?: string; explanation?: string; source?: unknown }>;
    };
    return Promise.all(
      (parsed.insights ?? []).slice(0, 8).map((insight) =>
        prisma.costInsight.create({
          data: {
            tenantId: context.tenantId,
            projectId: input.projectId,
            severity: insight.severity ?? InsightSeverity.MEDIUM,
            title: insight.title ?? "AI cost insight",
            explanation: insight.explanation ?? "AI generated an insight from project cost data.",
            source: (insight.source ?? { provider: "openai" }) as object,
          },
        }),
      ),
    );
  }

  const insights = await Promise.all(
    variances
      .filter((item) => item.consumedQty && Number(item.consumedQty) > Number(item.plannedQty) * 1.05)
      .map((item) =>
        prisma.costInsight.create({
          data: {
            tenantId: context.tenantId,
            projectId: input.projectId,
            severity: Number(item.consumedQty) > Number(item.plannedQty) * 1.2 ? InsightSeverity.HIGH : InsightSeverity.MEDIUM,
            title: `${item.code} consumption is above plan`,
            explanation: `${item.description} has consumed ${item.consumedQty?.toString()} ${item.unit} against a plan of ${item.plannedQty.toString()} ${item.unit}. Review site usage, wastage, and purchase approvals before the next PO.`,
            source: { boqItemId: item.id, plannedQty: item.plannedQty.toString(), consumedQty: item.consumedQty?.toString() },
          },
        }),
      ),
  );

  return insights;
}

export async function generateWeeklyReport(context: RequestContext, input: z.infer<typeof insightSchema>) {
  const queue = await enqueueAiReport({ tenantId: context.tenantId, projectId: input.projectId, reportType: "weekly" });
  const [project, issues, progress, insights] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: input.projectId, tenantId: context.tenantId } }),
    prisma.issue.findMany({ where: { tenantId: context.tenantId, status: "OPEN" }, take: 10, orderBy: { createdAt: "desc" } }),
    prisma.progressUpdate.findMany({ where: { tenantId: context.tenantId }, take: 20, orderBy: { createdAt: "desc" } }),
    prisma.costInsight.findMany({ where: { tenantId: context.tenantId, projectId: input.projectId, approved: false }, take: 10, orderBy: { createdAt: "desc" } }),
  ]);

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return JSON with summary, risks, nextActions arrays for a real estate builder weekly report." },
        { role: "user", content: JSON.stringify({ project, issues, progress, insights }) },
      ],
    });
    return { queue, report: JSON.parse(completion.choices[0]?.message.content ?? "{}") };
  }

  return { queue, report: { project, openIssues: issues, recentProgress: progress, costInsights: insights } };
}

export const ownerProgressSchema = z.object({
  plotId: z.string(),
});

export async function generateOwnerProgressSummary(context: RequestContext, input: z.infer<typeof ownerProgressSchema>) {
  const [plot, checklist, progress] = await Promise.all([
    prisma.plot.findFirstOrThrow({ where: { id: input.plotId, tenantId: context.tenantId }, include: { currentOwner: true } }),
    prisma.checklistItem.findMany({ where: { tenantId: context.tenantId, plotId: input.plotId }, orderBy: { category: "asc" } }),
    prisma.progressUpdate.findMany({ where: { tenantId: context.tenantId, visibleToOwner: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const avgProgress = checklist.length
    ? Math.round(checklist.reduce((sum, item) => sum + item.progressPct, 0) / checklist.length)
    : 0;

  return {
    plot,
    avgProgress,
    summary: `Plot ${plot.code} is ${avgProgress}% complete based on ${checklist.length} checklist items. ${progress[0]?.summary ?? "No owner-visible progress note has been posted yet."}`,
    checklist,
    recentProgress: progress,
  };
}
