import { notFound } from "next/navigation";
import { ExternalLink, FileStack } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { DevelopmentTaskForm, DevelopmentTaskUpdateForm } from "@/app/app/development/development-actions";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function SiteAssetWorkspacePage({
  params,
}: {
  params: { projectId: string; assetId: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;

  const [asset, configuredCategories, planFiles, updates] = await Promise.all([
    prisma.siteAsset.findFirst({
      where: {
        id: params.assetId,
        tenantId: session.tenantId,
        projectId: params.projectId,
        archivedAt: null,
      },
      include: { project: true },
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
        ownerId: params.assetId,
        categoryKey: "development-plan",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, mimeType: true },
    }),
    prisma.progressUpdate.findMany({
      where: {
        tenantId: session.tenantId,
        parentType: "SiteAsset",
        parentId: params.assetId,
      },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!asset) notFound();

  const attachmentIds = Array.from(
    new Set(
      updates.flatMap((update) =>
        Array.isArray(update.photoFileIds)
          ? update.photoFileIds.filter((value): value is string => typeof value === "string")
          : [],
      ),
    ),
  );

  const attachmentFiles = attachmentIds.length
    ? await prisma.fileAsset.findMany({
        where: { tenantId: session.tenantId, id: { in: attachmentIds }, deletedAt: null },
        select: { id: true, fileName: true },
      })
    : [];

  const attachmentMap = new Map(attachmentFiles.map((file) => [file.id, file]));
  const categories = Array.from(
    new Set([...configuredCategories.map((item) => item.label), asset.type, "General"].filter(Boolean)),
  );

  const task = {
    id: asset.id,
    projectId: asset.projectId,
    name: asset.name,
    category: asset.type,
    totalArea: asset.totalArea?.toString() ?? null,
    units: asset.units ?? null,
    deadline: asset.deadline?.toISOString() ?? null,
    status: asset.status,
    progressPct: asset.progressPct,
    assignedTo: asset.contractorId ?? null,
    planFiles: planFiles.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      taskId: asset.id,
      taskName: asset.name,
    })),
    updates: updates.map((update) => ({
      id: update.id,
      progressPct: update.progressPct,
      quantityDone: update.quantityDone?.toString() ?? null,
      recordedAt: update.recordedAt?.toISOString() ?? null,
      remarks: update.summary,
      attachments: Array.isArray(update.photoFileIds)
        ? update.photoFileIds
            .filter((value): value is string => typeof value === "string")
            .map((id) => attachmentMap.get(id))
            .filter((file): file is { id: string; fileName: string } => Boolean(file))
        : [],
    })),
  };

  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${asset.projectId}/development`} />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="text-sm text-slate-500">{asset.project.name}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{asset.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {asset.type} · {asset.status.replaceAll("_", " ")} · {asset.progressPct}% complete
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DevelopmentTaskUpdateForm task={task} />

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileStack size={18} />
              <h2 className="font-semibold">Task plans</h2>
            </div>
            <div className="space-y-3">
              {planFiles.map((file) => (
                <div className="rounded-lg border border-slate-200 p-3 text-sm" key={file.id}>
                  <div className="font-medium">{file.fileName}</div>
                  <div className="mt-3">
                    <a
                      className="btn-outline h-8 px-3 text-xs"
                      href={`/api/v1/files/${file.id}/download?disposition=inline&proxy=1`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={13} />
                      Open plan
                    </a>
                  </div>
                </div>
              ))}
              {!planFiles.length ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No plan file uploaded for this task yet.
                </div>
              ) : null}
            </div>
          </section>

          <DevelopmentTaskForm
            projectId={asset.projectId}
            categories={categories}
            initialTask={{
              id: asset.id,
              name: asset.name,
              category: asset.type,
              totalArea: asset.totalArea?.toString() ?? "",
              units: asset.units ?? "",
              deadline: asset.deadline ? asset.deadline.toISOString().slice(0, 10) : "",
              assignedTo: asset.contractorId ?? "",
              status:
                asset.status === "COMPLETED"
                  ? "COMPLETED"
                  : asset.status === "IN_PROGRESS"
                    ? "IN_PROGRESS"
                    : "PLANNED",
            }}
          />
        </aside>
      </div>
    </main>
  );
}
