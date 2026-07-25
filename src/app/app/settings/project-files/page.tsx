import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { ProjectFileFieldForm } from "./project-file-field-form";
import { BackButton } from "@/components/back-button";
import { SettingsTabs } from "../settings-tabs";
import { ProjectMapFieldEditor } from "../project-maps/project-map-field-editor";

export const dynamic = "force-dynamic";
export default async function ProjectFilesSettingsPage() {
  const session = await requirePagePermission("projects.manage");
  const fields = await prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_FILES", parentId: null }, include: { children: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } });
  return <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8"><BackButton fallbackHref="/app" /><SettingsTabs active="files" /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="self-start rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h1 className="font-semibold">Project file fields</h1><p className="mt-1 text-sm text-slate-500">These fields appear in every project under Upload files. Add sub-categories when one field needs multiple file groups.</p></div><div className="divide-y divide-slate-100">{fields.map((field) => <div className="px-5 py-4" key={field.id}><ProjectMapFieldEditor id={field.id} label={field.label} allowLogo={false} /><div className="ml-4 mt-3 border-l border-slate-200 pl-4"><div className="space-y-2">{field.children.map((child) => <ProjectMapFieldEditor id={child.id} label={child.label} allowLogo={false} key={child.id} />)}{!field.children.length ? <div className="text-xs text-slate-500">No sub-categories. Files will be uploaded directly under this field.</div> : null}</div><div className="mt-3 max-w-sm"><ProjectFileFieldForm section="PROJECT_FILES" parentId={field.id} /></div></div></div>)}{!fields.length ? <div className="p-8 text-center text-sm text-slate-500">No project file fields yet.</div> : null}</div></section><aside><ProjectFileFieldForm /></aside></div></main>;
}
