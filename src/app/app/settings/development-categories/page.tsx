import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { ProjectMapFieldEditor } from "../project-maps/project-map-field-editor";
import { ProjectFileFieldForm } from "../project-files/project-file-field-form";
import { Hammer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DevelopmentCategoriesSettingsPage() {
  const session = await requirePagePermission("development.manage");

  const categories = await prisma.projectFileField.findMany({
    where: { tenantId: session.tenantId, section: "DEVELOPMENT_TASK_CATEGORIES", parentId: null },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2"><Hammer size={18} className="text-navy-700" /><h2 className="text-lg font-semibold">Development categories</h2></div>
        <p className="mt-1 text-sm text-slate-500">Control the task categories available to every project development workflow.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h1 className="font-semibold">Development task categories</h1>
            <p className="mt-1 text-sm text-slate-500">These categories appear while creating development tasks in every project.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {categories.map((category) => (
              <div className="px-5 py-4" key={category.id}>
                <ProjectMapFieldEditor id={category.id} label={category.label} allowLogo={false} />
              </div>
            ))}
            {!categories.length ? <div className="p-8 text-center text-sm text-slate-500">No development categories yet.</div> : null}
          </div>
        </section>
        <aside>
          <ProjectFileFieldForm section="DEVELOPMENT_TASK_CATEGORIES" />
        </aside>
      </div>
    </div>
  );
}
