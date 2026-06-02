import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, FileDown, FileWarning, Landmark, Map, Plus, Users } from "lucide-react";
import type React from "react";
import { PlotStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";
import { CreateProjectForm } from "./projects/project-actions";
import { QuickAllotmentLink } from "./projects/simplified-workflow-actions";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSessionUser();
  if (!session) return null;

  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    include: {
      plots: { select: { id: true, status: true } },
      cadFiles: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { plots: true, cadFiles: true, siteAssets: true } },
    },
  });
  const plotStatus = await prisma.plot.groupBy({
    by: ["status"],
    where: { tenantId: session.tenantId },
    _count: true,
  });
  const plotCounts = Object.fromEntries(plotStatus.map((item) => [item.status, item._count]));
  const totalProjects = projects.length;
  const totalPlots = Object.values(plotCounts).reduce((sum, count) => sum + count, 0);
  const ownedPlotIds = await prisma.plot.findMany({
    where: { tenantId: session.tenantId, currentOwnerId: { not: null } },
    select: { id: true },
  });
  const documentRows = ownedPlotIds.length
    ? await prisma.fileAsset.groupBy({
        by: ["ownerId"],
        where: { tenantId: session.tenantId, ownerType: "Plot", ownerId: { in: ownedPlotIds.map((plot) => plot.id) }, deletedAt: null },
        _count: true,
      })
    : [];
  const plotsWithDocs = new Set(documentRows.map((row) => row.ownerId));
  const missingDocuments = ownedPlotIds.filter((plot) => !plotsWithDocs.has(plot.id)).length;

  return (
    <main className="px-4 py-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
            <div>
              <div className="text-sm font-medium text-gold-700">Admin command center</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Run projects, plots, ownership, and documents from one place</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Start with a project, open the plot registry, then complete allotment, documents, registry, and history from the plot workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-primary" href="/app/projects/new">
                <Plus size={17} />
                New project
              </Link>
              {projects[0] ? <QuickAllotmentLink projectId={projects[0].id} /> : null}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Metric icon={Building2} label="Projects" value={String(totalProjects)} />
            <Metric icon={Map} label="Total plots" value={String(totalPlots)} />
            <Metric icon={Landmark} label="With company" value={String(plotCounts.COMPANY_OWNED ?? 0)} />
            <Metric icon={Users} label="Allotted" value={String(plotCounts.ALLOTTED ?? 0)} />
            <Metric icon={CheckCircle2} label="Registered" value={String(plotCounts.REGISTERED ?? 0)} />
            <Metric icon={FileWarning} label="Doc gaps" value={String(missingDocuments)} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const companyPlots = project.plots.filter((plot) => plot.status === PlotStatus.COMPANY_OWNED).length;
              const cad = project.cadFiles[0];
              return (
              <div key={project.id} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Building2 size={16} />
                      {project.city}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold">{project.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{project.address ?? "No address saved"}</p>
                  </div>
                  <Link href={`/app/projects/${project.id}`} title="Open project">
                    <ArrowRight className="text-slate-400" size={18} />
                  </Link>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniMetric icon={Map} label="CAD" value={project._count.cadFiles} />
                  <MiniMetric icon={Users} label="Plots" value={project._count.plots} />
                  <MiniMetric icon={Landmark} label="Company" value={companyPlots} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="chip bg-slate-100 text-slate-700">{cad?.status.replaceAll("_", " ") ?? "No CAD"}</span>
                  <span className="chip bg-slate-100 text-slate-700">{project._count.siteAssets} assets</span>
                </div>
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{project.progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${project.progressPct}%` }} />
                  </div>
                </div>
                <div className="mt-4 text-sm font-medium text-navy-800">{project.budgetInr ? fullInr(Number(project.budgetInr)) : "Budget not set"}</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link className="btn-primary h-9 px-3 text-xs" href={`/app/projects/${project.id}`}>Open</Link>
                  <Link className="btn-outline h-9 px-3 text-xs" href={`/app/projects/${project.id}/ownership`}>Ownership</Link>
                  <Link className="btn-outline h-9 px-3 text-xs" href={`/app/projects/${project.id}/cad`}>CAD</Link>
                  <a className="btn-outline h-9 px-3 text-xs" href={`/api/v1/projects/${project.id}/report`}>
                    <FileDown size={14} />
                    Report
                  </a>
                </div>
              </div>
            );})}
          </div>

          {!projects.length ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Building2 className="mx-auto text-slate-400" size={32} />
              <h2 className="mt-3 font-semibold">Create the first project</h2>
              <p className="mt-2 text-sm text-slate-500">Once a project exists, CAD upload, plot selection, ownership, registry, and documents start from that workspace.</p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <CreateProjectForm compact />
          <div className="rounded-xl border border-slate-200 bg-navy-950 p-5 text-white shadow-card">
            <h2 className="font-semibold">Recommended workflow</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <Step number="1" label="Open or create project" />
              <Step number="2" label="Open plot registry" />
              <Step number="3" label="Add owner or change owner" />
              <Step number="4" label="Upload documents and generate letters" />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <Icon className="mx-auto text-navy-800" size={16} />
      <div className="mt-1 font-semibold">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <Icon className="text-navy-800" size={18} />
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Step({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-shine text-xs font-semibold text-navy-950">{number}</span>
      <span>{label}</span>
    </div>
  );
}
