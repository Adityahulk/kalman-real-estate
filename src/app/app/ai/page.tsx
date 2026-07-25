import { Bot, Sparkles } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { AiInsightActions } from "./insight-actions";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const session = await requirePagePermission("ai.generate");

  const insights = await prisma.costInsight.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">AI insights</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          AI reports explain cost variance, wastage, delays, contractor risk, weekly status, and owner progress from real project data.
        </p>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        {insights.map((insight) => (
          <article key={insight.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot size={18} />
                <h2 className="font-semibold">{insight.title}</h2>
              </div>
              <span className="chip bg-slate-100 text-slate-700">{insight.severity}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{insight.explanation}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">{insight.approved ? "Approved by human reviewer" : "Waiting for human review"}</div>
              <AiInsightActions insightId={insight.id} approved={insight.approved} />
            </div>
          </article>
        ))}
        {!insights.length ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            <Sparkles className="mx-auto mb-3" />
            No AI insights generated yet.
          </div>
        ) : null}
      </section>
    </main>
  );
}
