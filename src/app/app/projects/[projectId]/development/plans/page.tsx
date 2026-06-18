import { BackButton } from "@/components/back-button";
import { ExternalLink, FileStack } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function DevelopmentPlansPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const [project, assets, files] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.siteAsset.findMany({
      where: { tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      select: { id: true, name: true },
    }),
    prisma.fileAsset.findMany({
      where: { tenantId: session.tenantId, ownerType: "SiteAsset", categoryKey: "development-plan", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, ownerId: true, fileName: true, mimeType: true },
    }),
  ]);

  const assetMap = new Map(assets.map((asset) => [asset.id, asset.name]));
  const projectFiles = files.flatMap((file) => {
    if (!file.ownerId || !assetMap.has(file.ownerId)) return [];
    return [{ ...file, ownerId: file.ownerId, taskName: assetMap.get(file.ownerId) ?? "Task" }];
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${project.id}/development`} />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="text-sm text-slate-500">{project.name}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">View plans</h1>
        <p className="mt-2 text-sm text-slate-600">See all development task plans for this project.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileStack size={18} />
          <h2 className="font-semibold">Plans</h2>
        </div>
        <div className="space-y-3">
          {projectFiles.map((file) => (
            <div className="rounded-lg border border-slate-200 p-3 text-sm" key={file.id}>
              <div className="font-medium">{file.taskName}</div>
              <div className="mt-1 text-slate-500">{file.fileName}</div>
              <div className="mt-3">
                <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${file.id}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} />
                  Open plan
                </a>
              </div>
            </div>
          ))}
          {!projectFiles.length ? <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No task plans uploaded yet.</div> : null}
        </div>
      </section>
    </main>
  );
}
