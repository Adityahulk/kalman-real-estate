import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { ProjectMapFieldEditor } from "../project-maps/project-map-field-editor";
import { ProjectFileFieldForm } from "../project-files/project-file-field-form";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsSettingsPage() {
  const session = await requirePagePermission("projects.manage");
  const fields = await prisma.projectFileField.findMany({
    where: { tenantId: session.tenantId, section: "PROJECT_DETAILS", parentId: null },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2"><ClipboardList size={18} className="text-navy-700" /><h2 className="text-lg font-semibold">Project detail fields</h2></div>
        <p className="mt-1 text-sm text-slate-500">Add information that should appear on every new project and remain editable in Project Details.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold">Additional fields</h3>
            <p className="mt-1 text-sm text-slate-500">{fields.length} configured field{fields.length === 1 ? "" : "s"}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {fields.map((field) => <div className="px-5 py-4" key={field.id}><ProjectMapFieldEditor id={field.id} label={field.label} allowLogo={false} /></div>)}
            {!fields.length ? <div className="p-8 text-center text-sm text-slate-500">No project detail fields yet.</div> : null}
          </div>
        </section>
        <aside><ProjectFileFieldForm section="PROJECT_DETAILS" /></aside>
      </div>
    </div>
  );
}
