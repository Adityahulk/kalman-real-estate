import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { DevelopmentTaskForm } from "@/app/app/development/development-actions";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { hasPermission } from "@/server/rbac";
import { listEngineeringAssignees } from "@/server/services/development";

export const dynamic = "force-dynamic";

export default async function DevelopmentNewTaskPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  if (!hasPermission(session.role, "development.manage", session.permissions)) notFound();

  const [project, configuredCategories, assets, users] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.projectFileField.findMany({
      where: { tenantId: session.tenantId, section: "DEVELOPMENT_TASK_CATEGORIES", parentId: null },
      orderBy: { createdAt: "asc" },
      select: { label: true },
    }),
    prisma.siteAsset.findMany({
      where: { tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      select: { type: true },
    }),
    listEngineeringAssignees(session.tenantId),
  ]);

  const categories = Array.from(new Set([...configuredCategories.map((item) => item.label), ...assets.map((item) => item.type).filter(Boolean), "General"]));

  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${project.id}/development`} />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="text-sm text-slate-500">{project.name}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Add task</h1>
        <p className="mt-2 text-sm text-slate-600">Create a new development task for this project.</p>
      </header>
      <div className="max-w-3xl">
        <DevelopmentTaskForm
          projectId={project.id}
          categories={categories}
          assignees={users}
          canAssign={hasPermission(session.role, "engineering.assign", session.permissions)}
        />
      </div>
    </main>
  );
}
