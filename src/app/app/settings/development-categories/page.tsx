import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { BackButton } from "@/components/back-button";
import { SettingsTabs } from "../settings-tabs";
import { ProjectMapFieldEditor } from "../project-maps/project-map-field-editor";
import { ProjectFileFieldForm } from "../project-files/project-file-field-form";

export const dynamic = "force-dynamic";

export default async function DevelopmentCategoriesSettingsPage() {
  const session = await requirePagePermission("development.manage");

  const categories = await prisma.projectFileField.findMany({
    where: { tenantId: session.tenantId, section: "DEVELOPMENT_TASK_CATEGORIES", parentId: null },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app" />
      <SettingsTabs active="development" />
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
    </main>
  );
}
