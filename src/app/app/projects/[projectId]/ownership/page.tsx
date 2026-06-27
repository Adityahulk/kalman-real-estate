import Link from "next/link";
import { Landmark, Plus, Search, Users } from "lucide-react";
import { PlotStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { BackButton } from "@/components/back-button";
import { sortByPlotCode } from "@/lib/plot-code-sort";
import { OwnershipPlotRow } from "./ownership-plot-row";

export const dynamic = "force-dynamic";

export default async function ProjectOwnershipPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { q?: string; status?: string; statusGroup?: string; owner?: string; docs?: string; registry?: string; source?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const [project, firm] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { name: true } }),
  ]);
  const q = searchParams.q?.trim();
  const status = searchParams.status as PlotStatus | undefined;
  const owner = searchParams.owner?.trim();
  const allProjectPlots = await prisma.plot.findMany({
    where: { tenantId: session.tenantId, projectId: project.id, archivedAt: null },
    select: { id: true, status: true, currentOwnerId: true },
  });
  const cadLinks = await prisma.spatialLink.findMany({
    where: {
      tenantId: session.tenantId,
      recordType: "Plot",
      recordId: { in: allProjectPlots.map((plot) => plot.id) },
    },
    include: {
      entity: {
        select: {
          scene: { select: { cadFile: { select: { id: true, originalName: true, version: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const cadLinkByPlot = new Map<string, typeof cadLinks[number]>();
  for (const link of cadLinks) {
    if (!cadLinkByPlot.has(link.recordId)) cadLinkByPlot.set(link.recordId, link);
  }
  const cadLinkedPlotIds = [...cadLinkByPlot.keys()];

  const plots = await prisma.plot.findMany({
    where: {
      tenantId: session.tenantId,
      projectId: project.id,
      archivedAt: null,
      ...(searchParams.source === "cad" ? { id: { in: cadLinkedPlotIds } } : {}),
      ...(status ? { status } : {}),
      ...(searchParams.statusGroup === "allotted-transferred" ? { status: { in: [PlotStatus.ALLOTTED, PlotStatus.TRANSFERRED] } } : {}),
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
      checklistItems: { select: { progressPct: true } },
    },
  });

  const statusCounts = allProjectPlots.reduce<Record<string, number>>((counts, plot) => {
    counts[plot.status] = (counts[plot.status] ?? 0) + 1;
    return counts;
  }, {});
  const generatedLetters = await prisma.generatedDocument.findMany({
    where: { tenantId: session.tenantId, recordType: "Plot", recordId: { in: plots.map((plot) => plot.id) }, type: { contains: "allotment", mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  const signedLetters = await prisma.fileAsset.findMany({
    where: {
      tenantId: session.tenantId,
      ownerType: "Plot",
      ownerId: { in: plots.map((plot) => plot.id) },
      categoryKey: "signed-allotment-letter",
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  const letterByPlot = new Map<string, typeof generatedLetters[number]>();
  for (const letter of generatedLetters) {
    if (!letterByPlot.has(letter.recordId)) letterByPlot.set(letter.recordId, letter);
  }
  const signedLetterByPlotAndDocument = new Map<string, typeof signedLetters[number]>();
  for (const file of signedLetters) {
    if (!file.ownerId || !file.documentNo) continue;
    const key = `${file.ownerId}:${file.documentNo}`;
    if (!signedLetterByPlotAndDocument.has(key)) signedLetterByPlotAndDocument.set(key, file);
  }
  const filteredPlots = sortByPlotCode(plots);

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${project.id}`} />
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="text-sm text-slate-500">{project.name}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ownership ledger</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Search plots, check ownership and registry status, and open a plot for further actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href={`/app/projects/${project.id}/ownership/add-plot`}>
            <Plus size={17} />
            Add plot
          </Link>
          <Link className="btn-gold" href={`/app/projects/${project.id}/ownership/new-allotment`}>
            <Users size={17} />
            New allotment
          </Link>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total plots" value={String(allProjectPlots.length)} href={`/app/projects/${project.id}/ownership`} active={!searchParams.status && !searchParams.statusGroup && !searchParams.docs && !searchParams.source} />
        <SummaryCard label="From CAD" value={String(cadLinkedPlotIds.length)} href={`/app/projects/${project.id}/ownership?source=cad`} active={searchParams.source === "cad"} />
        <SummaryCard label="Company inventory" value={String(statusCounts.COMPANY_OWNED ?? 0)} href={`/app/projects/${project.id}/ownership?status=COMPANY_OWNED`} active={searchParams.status === "COMPANY_OWNED"} />
        <SummaryCard label="Allotted + transferred" value={String((statusCounts.ALLOTTED ?? 0) + (statusCounts.TRANSFERRED ?? 0))} href={`/app/projects/${project.id}/ownership?statusGroup=allotted-transferred`} active={searchParams.statusGroup === "allotted-transferred"} />
        <SummaryCard label="Registered" value={String(statusCounts.REGISTERED ?? 0)} href={`/app/projects/${project.id}/ownership?status=REGISTERED`} active={searchParams.status === "REGISTERED"} />
      </section>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]">
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
                <th className="px-5 py-3">Plot</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Area</th>
                <th className="px-5 py-3">Development</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlots.map((plot) => {
                const letter = letterByPlot.get(plot.id);
                const development = plot.checklistItems.length
                  ? Math.round(plot.checklistItems.reduce((total, item) => total + item.progressPct, 0) / plot.checklistItems.length)
                  : null;
                const signedLetter = letter?.number ? signedLetterByPlotAndDocument.get(`${plot.id}:${letter.number}`) : null;
                return (
                  <OwnershipPlotRow
                    key={plot.id}
                    href={`/app/projects/${project.id}/plots/${plot.id}`}
                    plotId={plot.id}
                    plot={plot.code}
                    ownerName={plot.currentOwner?.name ?? firm.name}
                    area={`${plot.areaSqYards?.toString() ?? (plot.areaSqft ? String(Number(plot.areaSqft) / 9) : "-")} sq yd`}
                    development={development}
                    allotmentStatus={plot.status === "COMPANY_OWNED" ? "Available for allotment" : plot.status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())}
                    document={letter ? {
                      id: letter.id,
                      status: letter.status,
                      fileAssetId: letter.fileAssetId,
                      viewFileAssetId: signedLetter?.id ?? letter.fileAssetId,
                      type: letter.type,
                      number: letter.number,
                      createdAt: letter.createdAt.toISOString(),
                    } : null}
                    cadSource={cadLinkByPlot.get(plot.id)?.entity.scene.cadFile ?? null}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, href, active = false }: { label: string; value: string; href: string; active?: boolean }) {
  return (
    <Link className={`rounded-xl border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${
      active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-navy-950"
    }`} href={href}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className={`mt-1 text-xs font-medium uppercase tracking-wide ${active ? "text-white/70" : "text-slate-500"}`}>{label}</div>
    </Link>
  );
}
