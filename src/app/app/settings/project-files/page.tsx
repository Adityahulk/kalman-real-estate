import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { ProjectFileFieldForm } from "./project-file-field-form";
import { BackButton } from "@/components/back-button";
import { SettingsTabs } from "../settings-tabs";
import { ProjectMapFieldEditor } from "../project-maps/project-map-field-editor";

export const dynamic = "force-dynamic";
export default async function ProjectFilesSettingsPage() {
  const session = await getSessionUser(); if (!session) redirect("/login");
  const fields = await prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_FILES" }, orderBy: { createdAt: "asc" } });
  return <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8"><BackButton fallbackHref="/app" /><SettingsTabs active="files" /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="self-start rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h1 className="font-semibold">Project file fields</h1><p className="mt-1 text-sm text-slate-500">These fields appear in every project under Upload files.</p></div><div className="divide-y divide-slate-100">{fields.map((field) => <div className="px-5 py-4" key={field.id}><ProjectMapFieldEditor id={field.id} label={field.label} allowLogo={false} /></div>)}{!fields.length ? <div className="p-8 text-center text-sm text-slate-500">No project file fields yet.</div> : null}</div></section><aside><ProjectFileFieldForm /></aside></div></main>;
}
