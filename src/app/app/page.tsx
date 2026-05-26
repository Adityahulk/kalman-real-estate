import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeIndianRupee, Building2, CheckCircle2, Clock3, FileCheck2, Map, Users } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CommandPage() {
  const session = await getSessionUser();
  if (!session) return null;

  try {
    const [projects, plots, cad, documents, issues, marketing, invoices, insights] = await Promise.all([
      prisma.project.findMany({ where: { tenantId: session.tenantId }, orderBy: { updatedAt: "desc" }, take: 6 }),
      prisma.plot.groupBy({ by: ["status"], where: { tenantId: session.tenantId }, _count: true }),
      prisma.cadFile.groupBy({ by: ["status"], where: { tenantId: session.tenantId }, _count: true }),
      prisma.generatedDocument.count({ where: { tenantId: session.tenantId } }),
      prisma.issue.count({ where: { tenantId: session.tenantId, status: "OPEN" } }),
      prisma.marketingTask.findMany({ where: { tenantId: session.tenantId }, orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.invoice.aggregate({ where: { tenantId: session.tenantId }, _sum: { totalInr: true }, _count: true }),
      prisma.costInsight.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    const allotted = plots.find((item) => item.status === "ALLOTTED")?._count ?? 0;
    const companyOwned = plots.find((item) => item.status === "COMPANY_OWNED")?._count ?? 0;
    const reviewRequired = cad.find((item) => item.status === "REVIEW_REQUIRED")?._count ?? 0;

    return (
      <main className="px-4 py-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Builder command centre</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Live database-backed view of projects, CAD processing, ownership, documents, site work, marketing, finance, and AI exceptions.
            </p>
          </div>
          <Link className="btn-primary" href="/app/cad">
            <Map size={17} />
            Upload CAD
          </Link>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Building2} label="Active Projects" value={String(projects.length)} />
          <Metric icon={Users} label="Allotted Plots" value={String(allotted)} />
          <Metric icon={Map} label="CAD In Review" value={String(reviewRequired)} />
          <Metric icon={BadgeIndianRupee} label="Invoice Exposure" value={fullInr(Number(invoices._sum.totalInr ?? 0))} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Projects</h2>
              <Link className="text-sm font-medium text-navy-800" href="/app/development">Open development</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {projects.map((project) => (
                <div key={project.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_180px] md:items-center">
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{project.city} · {project.status}</div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Progress</span>
                      <span>{project.progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${project.progressPct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {!projects.length ? <EmptyState label="No projects yet. Seed or create the first builder project." /> : null}
            </div>
          </div>

          <div className="space-y-6">
            <Panel title="Operations">
              <StatusRow icon={CheckCircle2} label="Company owned plots" value={companyOwned} />
              <StatusRow icon={FileCheck2} label="Generated documents" value={documents} />
              <StatusRow icon={AlertTriangle} label="Open issues" value={issues} />
            </Panel>

            <Panel title="Marketing">
              {marketing.map((task) => (
                <Link key={task.id} href="/app/marketing" className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  <span>{task.title}</span>
                  <span className="chip bg-slate-100 text-slate-700">{task.status.replaceAll("_", " ")}</span>
                </Link>
              ))}
              {!marketing.length ? <EmptyState label="No marketing tasks." /> : null}
            </Panel>

            <Panel title="AI Exceptions">
              {insights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-medium">{insight.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{insight.explanation}</div>
                </div>
              ))}
              {!insights.length ? <EmptyState label="No AI cost exceptions yet." /> : null}
            </Panel>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    return <DatabaseSetupError error={error} />;
  }
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="card p-5">
      <Icon className="text-navy-800" size={21} />
      <div className="mt-4 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2 text-sm">
      <span className="flex items-center gap-2 text-slate-600">
        <Icon size={16} />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{label}</div>;
}

function DatabaseSetupError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Database is not reachable";
  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="card max-w-3xl p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
            <Clock3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Database setup required</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The production app is running, but Postgres is not ready or migrations have not been applied.
            </p>
            <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{`docker compose up -d
npm run db:migrate
npm run db:seed`}</pre>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <ArrowRight size={14} />
              {message}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
