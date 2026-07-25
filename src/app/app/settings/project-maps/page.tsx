import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { ProjectFileFieldForm } from "../project-files/project-file-field-form";
import { ProjectMapFieldEditor } from "./project-map-field-editor";
import { Map } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectMapsSettingsPage() {
  const session = await requirePagePermission("projects.manage");
  const fields = await prisma.projectFileField.findMany({
    where: { tenantId: session.tenantId, section: "PROJECT_MAPS", parentId: null },
    include: { children: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2"><Map size={18} className="text-navy-700" /><h2 className="text-lg font-semibold">Project map structure</h2></div>
        <p className="mt-1 text-sm text-slate-500">The main Project Map is always available. Configure only additional plan types and their sub-options here.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="self-start overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h3 className="font-semibold">Additional map types</h3>
            <p className="mt-1 text-sm text-slate-500">{fields.length} configured map type{fields.length === 1 ? "" : "s"}</p>
          </div>
          <div className="space-y-3 p-4">
            {fields.map((field) => (
              <div className="rounded-lg border border-slate-200 p-4" key={field.id}>
                <ProjectMapFieldEditor id={field.id} label={field.label} logoFileId={field.logoFileId} />
                <div className="ml-3 mt-3 border-l-2 border-slate-100 pl-4">
                  <div className="space-y-2">
                    {field.children.map((child) => <div className="rounded-lg bg-slate-50 px-3 py-2" key={child.id}><ProjectMapFieldEditor id={child.id} label={child.label} logoFileId={child.logoFileId} /></div>)}
                    {!field.children.length ? <div className="text-xs text-slate-500">Plans upload directly to this map type.</div> : null}
                  </div>
                  <div className="mt-3"><ProjectFileFieldForm section="PROJECT_MAPS" parentId={field.id} compact /></div>
                </div>
              </div>
            ))}
            {!fields.length ? <div className="p-8 text-center text-sm text-slate-500">No additional project maps yet.</div> : null}
          </div>
        </section>
        <aside className="xl:sticky xl:top-20 xl:self-start"><ProjectFileFieldForm section="PROJECT_MAPS" /></aside>
      </div>
    </div>
  );
}
