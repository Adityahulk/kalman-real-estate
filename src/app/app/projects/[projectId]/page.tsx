import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { ProjectDetailsEditor } from "../project-details-editor";
import { BackButton } from "@/components/back-button";
import { ProjectWorkspaceNav } from "../project-workspace-nav";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage(
  props: { params: Promise<{ projectId: string }> }
) {
  const params = await props.params;
  const session = await requirePagePermission("projects.view");
  const [project, customFields] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({ where: { tenantId: session.tenantId, section: "PROJECT_DETAILS", parentId: null }, orderBy: { createdAt: "asc" } }),
  ]);
  return <main className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 lg:px-8">
    <header className="shrink-0"><BackButton fallbackHref="/app" /><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><div className="text-sm text-slate-500">{[project.city, project.state].filter(Boolean).join(", ") || "Location not added"}</div><h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>{project.address ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{project.address}</p> : null}</div></div><ProjectWorkspaceNav projectId={project.id} active="details" /></header>
    <section className="mt-5 min-h-[360px] flex-1 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <ProjectDetailsEditor customFields={customFields.map((field) => ({ id: field.id, key: field.key, label: field.label }))} project={{ id: project.id, name: project.name, city: project.city, state: project.state, address: project.address, developmentLicenses: project.developmentLicenses, reraNumber: project.reraNumber, landAreaAcres: project.landAreaAcres?.toString() ?? null, siteContactPhone: project.siteContactPhone, totalPlots: project.totalPlots, customFields: project.customFields && typeof project.customFields === "object" && !Array.isArray(project.customFields) ? project.customFields as Record<string, string> : {} }} />
    </section>
  </main>;
}
