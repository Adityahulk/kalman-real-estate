import Link from "next/link";
import { Building2, FileStack, Map, Settings, FileText } from "lucide-react";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ProjectDetailsEditor } from "../project-details-editor";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage({ params, searchParams }: { params: { projectId: string }; searchParams: { view?: string } }) {
  const session = await getSessionUser(); if (!session) return null;
  const [project, customFields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_DETAILS", parentId: null }, orderBy: { createdAt: "asc" } }),
  ]);
  const view = searchParams.view ?? "";
  return <main className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 lg:px-8">
    <header className="shrink-0 border-b border-slate-200 pb-5"><BackButton fallbackHref="/app" /><div className="mt-2 text-sm text-slate-500">{project.state ?? "State not added"}</div><h1 className="mt-1 text-2xl font-semibold">{project.name}</h1><div className="mt-4 flex flex-wrap gap-2"><Link className={view === "details" ? "btn-primary" : "btn-outline"} href={`/app/projects/${project.id}?view=details`}><Building2 size={16} /> Project detail list</Link><Link className="btn-outline" href={`/app/projects/${project.id}/cad`}><Map size={16} /> Maps</Link><Link className="btn-outline" href={`/app/projects/${project.id}/files`}><FileStack size={16} /> Upload files</Link><Link className="btn-outline ml-auto" href={`/app/projects/${project.id}/letters`}><FileText size={16} /> Set your letters</Link></div></header>
    <section className="mt-5 min-h-[360px] flex-1 rounded-lg border border-slate-200 bg-white p-5">
      {view === "details" ? <ProjectDetailsEditor customFields={customFields.map((field) => ({ id: field.id, key: field.key, label: field.label }))} project={{ id: project.id, name: project.name, city: project.city, state: project.state, address: project.address, developmentLicenses: project.developmentLicenses, reraNumber: project.reraNumber, landAreaAcres: project.landAreaAcres?.toString() ?? null, siteContactPhone: project.siteContactPhone, totalPlots: project.totalPlots, customFields: project.customFields && typeof project.customFields === "object" && !Array.isArray(project.customFields) ? project.customFields as Record<string, string> : {} }} /> : <div className="flex h-full items-center justify-center text-center"><div><Settings className="mx-auto text-slate-400" size={28} /><p className="mt-3 text-sm text-slate-500">Choose Project detail list, Maps, or Upload files.</p></div></div>}
    </section>
  </main>;
}
