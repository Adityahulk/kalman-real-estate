import Link from "next/link";
import { FileWarning, Landmark, Search } from "lucide-react";
import { PlotStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { fullInr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnershipPage(
  props: {
    searchParams: Promise<{ q?: string; projectId?: string; status?: string; owner?: string; docs?: string; registry?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await requirePagePermission("ownership.view");

  const [projects, plots] = await Promise.all([
    prisma.project.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    prisma.plot.findMany({
      where: {
        tenantId: session.tenantId,
        archivedAt: null,
        ...(searchParams.projectId ? { projectId: searchParams.projectId } : {}),
        ...(searchParams.status ? { status: searchParams.status as PlotStatus } : {}),
        ...(searchParams.owner ? { currentOwner: { name: { contains: searchParams.owner, mode: "insensitive" } } } : {}),
        ...(searchParams.q
          ? {
              OR: [
                { code: { contains: searchParams.q, mode: "insensitive" } },
                { label: { contains: searchParams.q, mode: "insensitive" } },
                { project: { name: { contains: searchParams.q, mode: "insensitive" } } },
                { currentOwner: { name: { contains: searchParams.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        project: true,
        currentOwner: true,
        registryRecords: { orderBy: { createdAt: "desc" }, take: 1 },
        ownershipRecords: { orderBy: { effectiveAt: "desc" }, take: 1 },
      },
      orderBy: [{ project: { name: "asc" } }, { code: "asc" }],
      take: 200,
    }),
  ]);

  const plotFiles = await prisma.fileAsset.groupBy({
    by: ["ownerId"],
    where: { tenantId: session.tenantId, ownerType: "Plot", ownerId: { in: plots.map((plot) => plot.id) }, deletedAt: null },
    _count: true,
  });
  const fileCountByPlot = new Map(plotFiles.map((file) => [file.ownerId, file._count]));
  const filteredPlots = plots.filter((plot) => {
    const hasDocs = (fileCountByPlot.get(plot.id) ?? 0) > 0;
    const registryStatus = plot.registryRecords[0]?.status ?? "Not started";
    if (searchParams.docs === "missing" && hasDocs) return false;
    if (searchParams.registry === "pending" && ["Completed", "COMPLETED", "Registered", "REGISTERED"].includes(registryStatus)) return false;
    return true;
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Ownership ledger archive</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Search all projects, then open a plot workspace to allot, transfer, update registry, upload documents, and review history.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_160px_160px_auto]">
        <label>
          <span className="label">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input className="input pl-9" name="q" defaultValue={searchParams.q ?? ""} placeholder="Plot, project, owner..." />
          </div>
        </label>
        <label>
          <span className="label">Project</span>
          <select className="input" name="projectId" defaultValue={searchParams.projectId ?? ""}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="input" name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">All</option>
            {Object.values(PlotStatus).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Documents</span>
          <select className="input" name="docs" defaultValue={searchParams.docs ?? ""}>
            <option value="">All</option>
            <option value="missing">Missing docs</option>
          </select>
        </label>
        <label>
          <span className="label">Registry</span>
          <select className="input" name="registry" defaultValue={searchParams.registry ?? ""}>
            <option value="">All</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <button className="btn-outline self-end">Filter</button>
      </form>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Landmark size={18} />
          <h2 className="font-semibold">Plots</h2>
          <span className="chip bg-slate-100 text-slate-700">{filteredPlots.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Plot</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Registry</th>
                <th className="px-5 py-3">Documents</th>
                <th className="px-5 py-3">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlots.map((plot) => {
                const documentCount = fileCountByPlot.get(plot.id) ?? 0;
                return (
                  <tr key={plot.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">{plot.project.name}</td>
                    <td className="px-5 py-3 font-medium">
                      <Link className="text-navy-900 hover:underline" href={`/app/projects/${plot.projectId}/plots/${plot.id}`}>{plot.code}</Link>
                    </td>
                    <td className="px-5 py-3">{plot.currentOwner?.name ?? "Company inventory"}</td>
                    <td className="px-5 py-3"><span className="chip bg-slate-100 text-slate-700">{plot.status.replaceAll("_", " ")}</span></td>
                    <td className="px-5 py-3">{plot.registryRecords[0]?.status ?? "Not started"}</td>
                    <td className="px-5 py-3">
                      {documentCount ? <span className="chip bg-emerald-50 text-emerald-700">{documentCount} files</span> : <span className="chip bg-amber-50 text-amber-800"><FileWarning size={13} /> Missing</span>}
                    </td>
                    <td className="px-5 py-3">{fullInr(Number(plot.ownershipRecords[0]?.amountInr ?? plot.priceInr ?? 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
