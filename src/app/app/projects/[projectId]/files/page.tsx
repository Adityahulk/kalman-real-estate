import Link from "next/link";
import { FileStack } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { ProjectFileWorkspace } from "../../project-file-workspace";
import { BackButton } from "@/components/back-button";
import { CategoryLinks } from "../../category-links";

export const dynamic = "force-dynamic";
export default async function ProjectFilesPage({ params, searchParams }: { params: { projectId: string }; searchParams: { category?: string; sub?: string } }) {
  const session = await getSessionUser(); if (!session) return null;
  const [project, fields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_FILES", parentId: null }, include: { children: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
  ]);
  const selected = fields.find((field) => field.key === searchParams.category);
  const selectedChild = selected?.children.find((field) => field.key === searchParams.sub);
  const activeField = selectedChild ?? (selected?.children.length ? null : selected);
  const files = activeField ? await prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Project", ownerId: project.id, categoryKey: activeField.key, deletedAt: null }, orderBy: { createdAt: "desc" } }) : [];
  return <main className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 lg:px-8"><header className="border-b border-slate-200 pb-4"><BackButton fallbackHref={`/app/projects/${project.id}`} /><div className="mt-2 text-sm text-slate-500">{project.state ?? project.city}</div><h1 className="mt-1 text-2xl font-semibold">{project.name} · Upload files</h1><CategoryLinks fields={fields} selectedId={selected?.id} hrefPrefix={`/app/projects/${project.id}/files?category=`} />{selected?.children.length ? <div className="border-t border-slate-100 pt-3"><CategoryLinks fields={selected.children} selectedId={selectedChild?.id} hrefPrefix={`/app/projects/${project.id}/files?category=${selected.key}&sub=`} /></div> : null}<Link className="btn-ghost mt-2" href="/app/settings/project-files"><FileStack size={15} /> Manage fields</Link></header><div className="mt-5 flex flex-1">{activeField ? <ProjectFileWorkspace projectId={project.id} label={activeField.label} categoryKey={activeField.key} files={files} /> : selected?.children.length ? <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Select a {selected.label} sub-category.</div> : <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">{fields.length ? "Select a file field." : "Add project file fields in Settings first."}</div>}</div></main>;
}
