import Link from "next/link";
import { FileStack, Map, Settings } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { CadUploadForm } from "../../../cad/cad-upload-form";
import { ProjectFileWorkspace } from "../../project-file-workspace";
import { BackButton } from "@/components/back-button";
import { DeleteCadButton } from "@/components/delete-cad-button";
import { CategoryLinks } from "../../category-links";
import { sortByPlotCode } from "@/lib/plot-code-sort";
import { ProjectOperationalMap } from "./project-operational-map";

export const dynamic = "force-dynamic";

export default async function ProjectCadPage({ params, searchParams }: { params: { projectId: string }; searchParams: { view?: string; sub?: string } }) {
  const session = await getSessionUser(); if (!session) return null;
  const [project, customFields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({
      where: { tenantId: session.tenantId, section: "PROJECT_MAPS", parentId: null },
      include: { children: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const view = searchParams.view ?? "";
  const category = customFields.find((item) => item.key === view);
  const selectedMap = category?.children.find((item) => item.key === searchParams.sub) ?? (category?.children.length ? null : category);
  const [files, cadFiles, plots, siteAssets] = await Promise.all([
    selectedMap ? prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Project", ownerId: project.id, categoryKey: selectedMap.key, deletedAt: null }, orderBy: { createdAt: "desc" } }) : [],
    view === "project" ? prisma.cadFile.findMany({ where: { tenantId: session.tenantId, projectId: project.id }, orderBy: { createdAt: "desc" } }) : [],
    view === "project" ? prisma.plot.findMany({
      where: { tenantId: session.tenantId, projectId: project.id, archivedAt: null },
      include: { currentOwner: { select: { name: true } } },
    }) : [],
    view === "project" ? prisma.siteAsset.findMany({
      where: { tenantId: session.tenantId, projectId: project.id, archivedAt: null },
      orderBy: { updatedAt: "desc" },
    }) : [],
  ]);
  const sortedPlots = sortByPlotCode(plots);
  return <main className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 lg:px-8"><header className="border-b border-slate-200 pb-4"><BackButton fallbackHref={`/app/projects/${project.id}`} /><div className="mt-2 text-sm text-slate-500">{project.state ?? project.city}</div><h1 className="mt-1 text-2xl font-semibold">{project.name} · Maps</h1><div className="mt-4 flex flex-wrap gap-2"><Link className={view === "project" ? "btn-primary" : "btn-outline"} href={`/app/projects/${project.id}/cad?view=project`}><Map size={16} /> Project Map</Link><Link className="btn-ghost" href="/app/settings/project-maps"><Settings size={15} /> Manage maps</Link></div><CategoryLinks fields={customFields} selectedId={category?.id} hrefPrefix={`/app/projects/${project.id}/cad?view=`} />{category?.children.length ? <div className="border-t border-slate-100 pt-3"><CategoryLinks fields={category.children} selectedId={selectedMap?.id} hrefPrefix={`/app/projects/${project.id}/cad?view=${category.key}&sub=`} /></div> : null}</header><section className="mt-5 flex flex-1">
    {view === "project" ? <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]"><div className="min-h-0 overflow-auto"><CadUploadForm projects={[{ id: project.id, name: project.name }]} fixedProjectId={project.id} fixedParentType="PROJECT" fixedParentId={project.id} title="Upload project map" description="Upload a new project layout version." simple redirectToReview /></div><div className="min-h-0 overflow-auto rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Interactive plot map</h2><p className="text-sm text-slate-500">{sortedPlots.length} published plots. Click a boundary to open its ownership workspace.</p></div><ProjectOperationalMap projectId={project.id} plots={sortedPlots.map((plot) => ({ id: plot.id, code: plot.code, status: plot.status, areaSqft: plot.areaSqft ? Number(plot.areaSqft) : null, ownerName: plot.currentOwner?.name ?? null, geometry: plot.geometry }))} siteAssets={siteAssets.map((a) => ({ id: a.id, name: a.name, type: a.type, status: a.status, progressPct: a.progressPct, geometry: a.geometry }))} /><div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">{sortedPlots.map((plot) => <Link className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50" href={`/app/projects/${project.id}/plots/${plot.id}`} key={plot.id}><div className="font-medium">{plot.code}</div><div className="text-xs text-slate-500">{plot.status.replaceAll("_", " ")}</div></Link>)}{!sortedPlots.length ? <div className="text-sm text-slate-500">No plots published yet.</div> : null}</div><div className="border-t border-slate-200 p-4"><h3 className="font-semibold">Map versions</h3><div className="mt-2 space-y-2">{cadFiles.map((file) => <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2" key={file.id}><Link className="min-w-0 flex-1 text-sm hover:text-navy-700" href={`/app/cad/${file.id}`}><span className="block truncate font-medium">{file.originalName}</span><span className="text-xs text-slate-500">v{file.version} · {file.status.replaceAll("_", " ")}</span></Link><DeleteCadButton cadFileId={file.id} fileName={file.originalName} published={file.status === "PUBLISHED"} /></div>)}</div></div></div></div> : selectedMap ? <ProjectFileWorkspace projectId={project.id} label={selectedMap.label} categoryKey={selectedMap.key} files={files} /> : category?.children.length ? <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Select a {category.label} sub-option.</div> : <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Select Project Map or another configured map.</div>}
  </section></main>;
}
