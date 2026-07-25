import Link from "next/link";
import { FileStack, Search } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { hasPermission } from "@/server/rbac";
import { ProjectFileWorkspace } from "../../project-file-workspace";
import { BackButton } from "@/components/back-button";
import { CategoryLinks } from "../../category-links";

export const dynamic = "force-dynamic";
type FileField = {
  id: string;
  key: string;
  label: string;
  children: Array<{ id: string; key: string; label: string }>;
};

function fileFieldLookup(fields: FileField[]) {
  const map = new Map<string, { label: string; path: string; searchable: string }>();
  for (const field of fields) {
    map.set(field.key, {
      label: field.label,
      path: field.label,
      searchable: `${field.label} ${field.key}`,
    });
    for (const child of field.children) {
      map.set(child.key, {
        label: child.label,
        path: `${field.label} / ${child.label}`,
        searchable: `${field.label} ${field.key} ${child.label} ${child.key}`,
      });
    }
  }
  return map;
}

export default async function ProjectFilesPage(
  props: { params: Promise<{ projectId: string }>; searchParams: Promise<{ category?: string; sub?: string; q?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await requirePagePermission("documents.view");
  const query = searchParams.q?.trim() ?? "";
  const [project, fields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_FILES", parentId: null }, include: { children: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
  ]);
  const selected = fields.find((field) => field.key === searchParams.category);
  const selectedChild = selected?.children.find((field) => field.key === searchParams.sub);
  const activeField = selectedChild ?? (selected?.children.length ? null : selected);
  const lookup = fileFieldLookup(fields);
  const canUpload = hasPermission(session.role, "files.upload", session.permissions);
  const canManageFields = hasPermission(session.role, "projects.manage", session.permissions);
  const files = query
    ? await prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Project", ownerId: project.id, deletedAt: null }, orderBy: { createdAt: "desc" } })
    : activeField
      ? await prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Project", ownerId: project.id, categoryKey: activeField.key, deletedAt: null }, orderBy: { createdAt: "desc" } })
      : [];
  const normalizedQuery = query.toLowerCase();
  const visibleFiles = query
    ? files.filter((file) => {
        const field = file.categoryKey ? lookup.get(file.categoryKey) : null;
        const haystack = `${file.fileName} ${file.categoryKey ?? ""} ${field?.searchable ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : files;
  const uploaderIds = [...new Set(visibleFiles.map((file) => file.uploadedById).filter((id): id is string => Boolean(id)))];
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({ where: { id: { in: uploaderIds }, tenantId: session.tenantId }, select: { id: true, name: true } })
    : [];
  const uploaderNames = new Map(uploaders.map((user) => [user.id, user.name]));
  const filesWithContext = visibleFiles.map((file) => {
    const field = file.categoryKey ? lookup.get(file.categoryKey) : null;
    return {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      createdAt: file.createdAt,
      version: file.version,
      uploadedByName: file.uploadedById ? uploaderNames.get(file.uploadedById) ?? "Former user" : "System",
      categoryLabel: field?.path ?? file.categoryKey ?? "Uncategorised",
    };
  });

  return <main className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 lg:px-8">
    <header className="border-b border-slate-200 pb-4">
      <BackButton fallbackHref={`/app/projects/${project.id}`} />
      <div className="mt-2 text-sm text-slate-500">{project.state ?? project.city}</div>
      <h1 className="mt-1 text-2xl font-semibold">{project.name} · Upload files</h1>
      <form className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row" action={`/app/projects/${project.id}/files`}>
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
          <input className="input h-9 pl-9" name="q" defaultValue={query} placeholder="Search any category, sub-category, or file" />
        </label>
        <button className="btn-outline h-9 px-4" type="submit">Search</button>
        {query ? <Link className="btn-ghost h-9 px-4" href={`/app/projects/${project.id}/files`}>Clear</Link> : null}
      </form>
      {!query ? <CategoryLinks fields={fields} selectedId={selected?.id} hrefPrefix={`/app/projects/${project.id}/files?category=`} /> : null}
      {!query && selected?.children.length ? <div className="border-t border-slate-100 pt-3"><CategoryLinks fields={selected.children} selectedId={selectedChild?.id} hrefPrefix={`/app/projects/${project.id}/files?category=${selected.key}&sub=`} /></div> : null}
      {canManageFields ? <Link className="btn-ghost mt-2" href="/app/settings/project-files"><FileStack size={15} /> Manage fields</Link> : null}
    </header>
    <div className="mt-5 flex flex-1">
      {query ? <ProjectFileWorkspace projectId={project.id} label={`Search results for "${query}"`} files={filesWithContext} canUpload={false} /> : activeField ? <ProjectFileWorkspace projectId={project.id} label={activeField.label} categoryKey={activeField.key} files={filesWithContext} canUpload={canUpload} /> : selected?.children.length ? <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Select a {selected.label} sub-category.</div> : <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">{fields.length ? "Select a file field or search all files." : "Add project file fields in Settings first."}</div>}
    </div>
  </main>;
}
