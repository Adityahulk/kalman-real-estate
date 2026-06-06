import Link from "next/link";
import { Building2, FileDown, Map, Plus, Search, Users } from "lucide-react";
import { PlotStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { WhatsAppShareLink } from "./simplified-workflow-actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: { q?: string; city?: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const q = searchParams.q?.trim();
  const city = searchParams.city?.trim();
  const projects = await prisma.project.findMany({
    where: {
      tenantId: session.tenantId,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    },
    include: {
      plots: { where: { archivedAt: null }, select: { id: true, status: true } },
      cadFiles: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { plots: { where: { archivedAt: null } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="text-sm text-slate-500">Admin</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Search projects, open the main workspace, share project details, and export plot ownership reports.
          </p>
        </div>
        <Link className="btn-primary" href="/app/projects/new">
          <Plus size={17} />
          New project
        </Link>
      </div>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]">
        <label>
          <span className="label">Search project</span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input className="input pl-9" name="q" defaultValue={searchParams.q ?? ""} placeholder="Project name or city" />
          </div>
        </label>
        <label>
          <span className="label">City</span>
          <input className="input" name="city" defaultValue={searchParams.city ?? ""} />
        </label>
        <button className="btn-outline self-end">Filter</button>
      </form>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Building2 size={18} />
          <h2 className="font-semibold">Project table</h2>
          <span className="chip bg-slate-100 text-slate-700">{projects.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Project Name</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">CAD Status</th>
                <th className="px-5 py-3">Total Plots</th>
                <th className="px-5 py-3">With Company</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => {
                const companyPlots = project.plots.filter((plot) => plot.status === PlotStatus.COMPANY_OWNED).length;
                const cad = project.cadFiles[0];
                const shareText = `${project.name}, ${project.city}. Total plots: ${project._count.plots}. Company-held plots: ${companyPlots}.`;
                return (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link className="font-medium text-navy-900 hover:underline" href={`/app/projects/${project.id}`}>{project.name}</Link>
                      <div className="mt-1 text-xs text-slate-500">{project.address ?? "No address saved"}</div>
                    </td>
                    <td className="px-5 py-3">{project.city}</td>
                    <td className="px-5 py-3">
                      <span className="chip bg-slate-100 text-slate-700">
                        <Map size={13} />
                        {cad?.status.replaceAll("_", " ") ?? "No CAD"}
                      </span>
                    </td>
                    <td className="px-5 py-3">{project._count.plots}</td>
                    <td className="px-5 py-3">
                      <span className="chip bg-gold-50 text-navy-900">
                        <Users size={13} />
                        {companyPlots}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex min-w-[420px] flex-wrap gap-2">
                        <Link className="btn-primary h-8 px-3 text-xs" href={`/app/projects/${project.id}`}>Open Workspace</Link>
                        <WhatsAppShareLink compact text={shareText} />
                        <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/projects/${project.id}/report`}>
                          <FileDown size={14} />
                          Download Report
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!projects.length ? <div className="p-8 text-center text-sm text-slate-500">No projects found.</div> : null}
      </section>
    </main>
  );
}
