import Link from "next/link";
import { FileStack } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { ProjectFileWorkspace } from "../../project-file-workspace";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";
export default async function ProjectFilesPage({ params, searchParams }: { params: { projectId: string }; searchParams: { category?: string } }) {
  const session = await getSessionUser(); if (!session) return null;
  const [project, fields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_FILES" }, orderBy: { createdAt: "asc" } }),
  ]);
  const selected = fields.find((field) => field.key === searchParams.category);
  const files = selected ? await prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Project", ownerId: project.id, categoryKey: selected.key, deletedAt: null }, orderBy: { createdAt: "desc" } }) : [];
  return <main className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden px-4 py-6 lg:px-8"><header className="shrink-0 border-b border-slate-200 pb-4"><BackButton fallbackHref={`/app/projects/${project.id}`} /><div className="mt-2 text-sm text-slate-500">{project.state ?? project.city}</div><h1 className="mt-1 text-2xl font-semibold">{project.name} · Upload files</h1><div className="mt-4 flex flex-wrap gap-2">{fields.map((field) => <Link className={selected?.id === field.id ? "btn-primary" : "btn-outline"} href={`/app/projects/${project.id}/files?category=${field.key}`} key={field.id}>{field.label}</Link>)}<Link className="btn-ghost" href="/app/settings/project-files"><FileStack size={15} /> Manage fields</Link></div></header><div className="mt-5 flex min-h-0 flex-1">{selected ? <ProjectFileWorkspace projectId={project.id} label={selected.label} categoryKey={selected.key} files={files} /> : <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">{fields.length ? "Select a file field." : "Add project file fields in Settings first."}</div>}</div></main>;
}
