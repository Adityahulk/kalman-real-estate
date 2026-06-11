import Link from "next/link";
import { FileStack, Map, Plus, Zap } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { CadUploadForm } from "../../../cad/cad-upload-form";
import { ProjectFileWorkspace } from "../../project-file-workspace";
import { ProjectFileFieldForm } from "../../../settings/project-files/project-file-field-form";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

const defaults = [
  { key: "electrical_plan", label: "Electrical plans", icon: Zap },
  { key: "water_sewage", label: "Water sewage", icon: FileStack },
];

export default async function ProjectCadPage({ params, searchParams }: { params: { projectId: string }; searchParams: { view?: string } }) {
  const session = await getSessionUser(); if (!session) return null;
  const [project, customFields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "CAD" }, orderBy: { createdAt: "asc" } }),
  ]);
  const categories = [...defaults, ...customFields.map((field) => ({ key: field.key, label: field.label, icon: FileStack }))];
  const view = searchParams.view ?? "";
  const category = categories.find((item) => item.key === view);
  const [files, cadFiles, plots] = await Promise.all([
    category ? prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Project", ownerId: project.id, categoryKey: category.key, deletedAt: null }, orderBy: { createdAt: "desc" } }) : [],
    view === "project" ? prisma.cadFile.findMany({ where: { tenantId: session.tenantId, projectId: project.id }, orderBy: { createdAt: "desc" } }) : [],
    view === "project" ? prisma.plot.findMany({ where: { tenantId: session.tenantId, projectId: project.id, archivedAt: null }, orderBy: { code: "asc" } }) : [],
  ]);
  return <main className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden px-4 py-6 lg:px-8"><header className="shrink-0 border-b border-slate-200 pb-4"><BackButton fallbackHref={`/app/projects/${project.id}`} /><div className="mt-2 text-sm text-slate-500">{project.state ?? project.city}</div><h1 className="mt-1 text-2xl font-semibold">{project.name} · CAD</h1><div className="mt-4 flex flex-wrap gap-2"><Link className={view === "project" ? "btn-primary" : "btn-outline"} href={`/app/projects/${project.id}/cad?view=project`}><Map size={16} /> Project CAD</Link>{categories.map((item) => <Link className={view === item.key ? "btn-primary" : "btn-outline"} href={`/app/projects/${project.id}/cad?view=${item.key}`} key={item.key}><item.icon size={16} /> {item.label}</Link>)}</div></header><section className="mt-5 flex min-h-0 flex-1">
    {view === "project" ? <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]"><div className="min-h-0 overflow-auto space-y-4"><CadUploadForm projects={[{ id: project.id, name: project.name }]} fixedProjectId={project.id} fixedParentType="PROJECT" fixedParentId={project.id} title="Upload project CAD" description="Upload a new project layout version." simple redirectToReview /><ProjectFileFieldForm section="CAD" /></div><div className="min-h-0 overflow-auto rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">All plots</h2><p className="text-sm text-slate-500">{plots.length} plots from the project</p></div><div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">{plots.map((plot) => <Link className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50" href={`/app/projects/${project.id}/plots/${plot.id}`} key={plot.id}><div className="font-medium">{plot.code}</div><div className="text-xs text-slate-500">{plot.status.replaceAll("_", " ")}</div></Link>)}{!plots.length ? <div className="text-sm text-slate-500">No plots published yet.</div> : null}</div><div className="border-t border-slate-200 p-4"><h3 className="font-semibold">CAD versions</h3><div className="mt-2 space-y-2">{cadFiles.map((file) => <Link className="block rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100" href={`/app/cad/${file.id}`} key={file.id}>{file.originalName} · v{file.version}</Link>)}</div></div></div></div> : category ? <ProjectFileWorkspace projectId={project.id} label={category.label} categoryKey={category.key} files={files} /> : <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Select Project CAD, Electrical plans, Water sewage, or add a custom plan field.</div>}
  </section></main>;
}
