import Link from "next/link";
import { FileText, FileWarning, GitBranch, Landmark, Search, UserRoundCheck } from "lucide-react";
import { PlotStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";
import { AddPlotPanel, QuickAllotmentLink } from "../../simplified-workflow-actions";

export const dynamic = "force-dynamic";

export default async function ProjectOwnershipPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { q?: string; status?: string; owner?: string; docs?: string; registry?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } });
  const q = searchParams.q?.trim();
  const status = searchParams.status as PlotStatus | undefined;
  const owner = searchParams.owner?.trim();

  const plots = await prisma.plot.findMany({
    where: {
      tenantId: session.tenantId,
      projectId: project.id,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { label: { contains: q, mode: "insensitive" } },
              { currentOwner: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(owner ? { currentOwner: { name: { contains: owner, mode: "insensitive" } } } : {}),
    },
    include: {
      currentOwner: true,
      registryRecords: { orderBy: { createdAt: "desc" }, take: 1 },
      ownershipRecords: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
    orderBy: { code: "asc" },
  });

  const plotFiles = await prisma.fileAsset.groupBy({
    by: ["ownerId"],
    where: { tenantId: session.tenantId, ownerType: "Plot", ownerId: { in: plots.map((plot) => plot.id) }, deletedAt: null },
    _count: true,
  });
  const fileCountByPlot = new Map(plotFiles.map((file) => [file.ownerId, file._count]));
  const generatedLetters = await prisma.generatedDocument.findMany({
    where: { tenantId: session.tenantId, recordType: "Plot", recordId: { in: plots.map((plot) => plot.id) } },
    orderBy: { createdAt: "desc" },
  });
  const letterByPlot = new Map<string, typeof generatedLetters[number]>();
  for (const letter of generatedLetters) {
    if (!letterByPlot.has(letter.recordId)) letterByPlot.set(letter.recordId, letter);
  }
  const filteredPlots = plots.filter((plot) => {
    const hasDocs = (fileCountByPlot.get(plot.id) ?? 0) > 0;
    const registryStatus = plot.registryRecords[0]?.status ?? "Not started";
    if (searchParams.docs === "missing" && hasDocs) return false;
    if (searchParams.registry === "pending" && ["Completed", "COMPLETED", "Registered", "REGISTERED"].includes(registryStatus)) return false;
    return true;
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="text-sm text-slate-500">{project.name}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ownership ledger</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Search plots, check owner details, registry state, document gaps, and open the plot workspace for actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href={`/app/projects/${project.id}/cad`}>
            Open CAD map
          </Link>
          <AddPlotPanel compact projectId={project.id} />
          <QuickAllotmentLink projectId={project.id} />
        </div>
      </div>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_160px_160px_auto]">
        <label>
          <span className="label">Search plot or owner</span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input className="input pl-9" name="q" defaultValue={searchParams.q ?? ""} placeholder="A-101, owner name..." />
          </div>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="input" name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">All</option>
            {Object.values(PlotStatus).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Owner</span>
          <input className="input" name="owner" defaultValue={searchParams.owner ?? ""} />
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <AddPlotPanel projectId={project.id} />
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Plot registry is the ownership workbench</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use CAD when you have a DXF layout, or add plots manually when the builder has only plot numbers and owner records.
            Every row opens the same plot workspace for ownership, documents, registry, letters, and history.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn-primary" href={`/app/projects/${project.id}/cad`}>Upload CAD</Link>
            <QuickAllotmentLink projectId={project.id} />
            <span className="chip bg-slate-100 text-slate-700">CAD and manual plots use the same workflow</span>
          </div>
        </div>
      </section>

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
                <th className="px-5 py-3">Plot</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Registry</th>
                <th className="px-5 py-3">Documents</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlots.map((plot) => {
                const documentCount = fileCountByPlot.get(plot.id) ?? 0;
                const letter = letterByPlot.get(plot.id);
                return (
                  <tr key={plot.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">
                      <Link className="text-navy-900 hover:underline" href={`/app/projects/${project.id}/plots/${plot.id}`}>{plot.code}</Link>
                      <div className="text-xs text-slate-500">{plot.areaSqft?.toString() ?? "-"} sq ft</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <UserRoundCheck size={16} className="text-slate-400" />
                        {plot.currentOwner?.name ?? "Company inventory"}
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="chip bg-slate-100 text-slate-700">{plot.status.replaceAll("_", " ")}</span></td>
                    <td className="px-5 py-3">{plot.registryRecords[0]?.status ?? "Not started"}</td>
                    <td className="px-5 py-3">
                      {documentCount ? (
                        <span className="chip bg-emerald-50 text-emerald-700">{documentCount} files</span>
                      ) : (
                        <span className="chip bg-amber-50 text-amber-800"><FileWarning size={13} /> Missing</span>
                      )}
                    </td>
                    <td className="px-5 py-3">{fullInr(Number(plot.ownershipRecords[0]?.amountInr ?? plot.priceInr ?? 0))}</td>
                    <td className="px-5 py-3">
                      <div className="flex min-w-[300px] flex-wrap gap-2">
                        <Link className="btn-primary h-8 px-3 text-xs" href={`/app/projects/${project.id}/plots/${plot.id}`}>Open</Link>
                        <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${project.id}/plots/${plot.id}?tab=documents`}>
                          <FileText size={14} />
                          {letter?.fileAssetId ? "Download Letter" : "Generate Letter"}
                        </Link>
                        <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${project.id}/plots/${plot.id}?tab=ownership#ownership-action`}>
                          <GitBranch size={14} />
                          {plot.currentOwnerId ? "Change Owner" : "Add Owner"}
                        </Link>
                      </div>
                    </td>
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
