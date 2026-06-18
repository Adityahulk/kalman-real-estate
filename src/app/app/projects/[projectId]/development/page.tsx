import { BackButton } from "@/components/back-button";
import { DevelopmentTaskDashboard } from "@/app/app/development/development-actions";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ProjectDevelopmentPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const [project, assets, configuredCategories, taskPlanFiles] = await Promise.all([
    prisma.project.findFirstOrThrow({
      where: { id: params.projectId, tenantId: session.tenantId },
    }),
    prisma.siteAsset.findMany({
      where: { tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      orderBy: [{ deadline: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.projectFileField.findMany({
      where: { tenantId: session.tenantId, section: "DEVELOPMENT_TASK_CATEGORIES", parentId: null },
      orderBy: { createdAt: "asc" },
      select: { label: true },
    }),
    prisma.fileAsset.findMany({
      where: {
        tenantId: session.tenantId,
        ownerType: "SiteAsset",
        categoryKey: "development-plan",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, ownerId: true, fileName: true, mimeType: true },
    }),
  ]);

  const tasks = assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    category: asset.type,
    totalArea: asset.totalArea?.toString() ?? null,
    units: asset.units ?? null,
    deadline: asset.deadline?.toISOString() ?? null,
    status: asset.status,
    progressPct: asset.progressPct,
    assignedTo: asset.contractorId ?? null,
    planFiles: taskPlanFiles
      .filter((file) => file.ownerId === asset.id)
      .map((file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        taskId: asset.id,
        taskName: asset.name,
      })),
  }));

  const categories = Array.from(
    new Set([
      ...configuredCategories.map((item) => item.label),
      ...assets.map((asset) => asset.type).filter(Boolean),
      "General",
    ]),
  );

  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${project.id}`} />
      <DevelopmentTaskDashboard
        projectId={project.id}
        projectName={project.name}
        projectLocation={project.state ?? project.city}
        categories={categories}
        tasks={tasks}
      />
    </main>
  );
}
