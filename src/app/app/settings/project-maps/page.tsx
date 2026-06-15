import { redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { ProjectFileFieldForm } from "../project-files/project-file-field-form";
import { SettingsTabs } from "../settings-tabs";
import { ProjectMapFieldEditor } from "./project-map-field-editor";

export const dynamic = "force-dynamic";

export default async function ProjectMapsSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const fields = await prisma.projectFileField.findMany({
    where: { tenantId: session.tenantId, section: "PROJECT_MAPS", parentId: null },
    include: { children: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app" />
      <SettingsTabs active="maps" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h1 className="font-semibold">Project maps</h1>
            <p className="mt-1 text-sm text-slate-500">Project Map is fixed. Configure every additional map and its optional sub-options here.</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-4"><div className="font-medium">Project Map</div><div className="mt-1 text-xs text-slate-500">Fixed map used for plots and the complete project layout.</div></div>
            {fields.map((field) => (
              <div className="px-5 py-4" key={field.id}>
                <ProjectMapFieldEditor id={field.id} label={field.label} logoFileId={field.logoFileId} />
                <div className="ml-4 mt-3 border-l border-slate-200 pl-4">
                  <div className="space-y-2">
                    {field.children.map((child) => <ProjectMapFieldEditor id={child.id} label={child.label} logoFileId={child.logoFileId} key={child.id} />)}
                    {!field.children.length ? <div className="text-xs text-slate-500">No sub-options. Files will be uploaded directly under this map.</div> : null}
                  </div>
                  <div className="mt-3 max-w-sm"><ProjectFileFieldForm section="PROJECT_MAPS" parentId={field.id} /></div>
                </div>
              </div>
            ))}
            {!fields.length ? <div className="p-8 text-center text-sm text-slate-500">No additional project maps yet.</div> : null}
          </div>
        </section>
        <aside><ProjectFileFieldForm section="PROJECT_MAPS" /></aside>
      </div>
    </main>
  );
}
