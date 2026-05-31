import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, Map, Plus, Users } from "lucide-react";
import type React from "react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";
import { CreateProjectForm } from "./projects/project-actions";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSessionUser();
  if (!session) return null;

  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { plots: true, cadFiles: true, siteAssets: true } },
    },
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
            <div>
              <div className="text-sm font-medium text-gold-700">Project-first workspace</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Select a project to run the builder operating system</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Open a project once, then use CAD, ownership, registry, documents, and development from the same workspace.
              </p>
            </div>
            <Link className="btn-primary" href="/app/projects/new">
              <Plus size={17} />
              New project
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/app/projects/${project.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Building2 size={16} />
                      {project.city}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold">{project.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{project.address ?? "No address saved"}</p>
                  </div>
                  <ArrowRight className="text-slate-400" size={18} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniMetric icon={Map} label="CAD" value={project._count.cadFiles} />
                  <MiniMetric icon={Users} label="Plots" value={project._count.plots} />
                  <MiniMetric icon={FileCheck2} label="Assets" value={project._count.siteAssets} />
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
              </Link>
            ))}
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
              <Step number="2" label="Upload DXF site CAD" />
              <Step number="3" label="Publish plots after review" />
              <Step number="4" label="Click plot to manage ownership and documents" />
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

function Step({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-shine text-xs font-semibold text-navy-950">{number}</span>
      <span>{label}</span>
    </div>
  );
}
