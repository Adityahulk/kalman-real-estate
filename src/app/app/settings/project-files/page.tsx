import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { ProjectFileFieldForm } from "./project-file-field-form";
import { ProjectMapFieldEditor } from "../project-maps/project-map-field-editor";
import { FileStack } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function ProjectFilesSettingsPage() {
  const session = await requirePagePermission("projects.manage");
  const fields = await prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_FILES", parentId: null }, include: { children: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } });
  return <div>
    <div className="mb-4">
      <div className="flex items-center gap-2"><FileStack size={18} className="text-navy-700" /><h2 className="text-lg font-semibold">Project file structure</h2></div>
      <p className="mt-1 text-sm text-slate-500">Organize approvals and project records into clear categories and optional sub-categories.</p>
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="self-start overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="font-semibold">Configured file categories</h3>
          <p className="mt-1 text-sm text-slate-500">{fields.length} main categor{fields.length === 1 ? "y" : "ies"}</p>
        </div>
        <div className="space-y-3 p-4">
          {fields.map((field) => <div className="rounded-lg border border-slate-200 p-4" key={field.id}>
            <ProjectMapFieldEditor id={field.id} label={field.label} allowLogo={false} />
            <div className="ml-3 mt-3 border-l-2 border-slate-100 pl-4">
              <div className="space-y-2">{field.children.map((child) => <div className="rounded-lg bg-slate-50 px-3 py-2" key={child.id}><ProjectMapFieldEditor id={child.id} label={child.label} allowLogo={false} /></div>)}</div>
              {!field.children.length ? <div className="mb-3 text-xs text-slate-500">Files upload directly to this category.</div> : null}
              <ProjectFileFieldForm section="PROJECT_FILES" parentId={field.id} compact />
            </div>
          </div>)}
          {!fields.length ? <div className="p-8 text-center text-sm text-slate-500">No project file categories yet.</div> : null}
        </div>
      </section>
      <aside className="xl:sticky xl:top-20 xl:self-start"><ProjectFileFieldForm /></aside>
    </div>
  </div>;
}
