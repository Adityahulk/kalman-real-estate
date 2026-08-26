import { notFound } from "next/navigation";
import { Download, FileText, Film, ImageIcon } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { FileActions } from "@/components/file-actions";
import { prisma } from "@/server/db";
import { requireAnyPagePermission } from "@/server/page-auth";
import { MarketingMediaPanel, MarketingProjectDetailEditor } from "../marketing-actions";

export const dynamic = "force-dynamic";

export default async function MarketingProjectDetailPage(props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  const session = await requireAnyPagePermission(["marketing.manage", "marketing.execute"]);

  const task = await prisma.marketingTask.findFirst({
    where: {
      id: params.taskId,
      tenantId: session.tenantId,
      status: "APPROVED",
      archivedAt: null,
      ...(Array.isArray(session.projectIds) ? { projectId: { in: session.projectIds } } : {}),
    },
    include: { media: true },
  });

  if (!task) notFound();

  const links = Array.isArray(task.links) ? task.links.filter((item): item is string => typeof item === "string") : [];
  const files = task.media.length
    ? await prisma.fileAsset.findMany({
        where: {
          tenantId: session.tenantId,
          id: { in: task.media.map((media) => media.fileAssetId) },
          deletedAt: null,
        },
      })
    : [];
  const filesById = new Map(files.map((file) => [file.id, file]));
  const media = task.media
    .map((item) => ({ ...item, file: filesById.get(item.fileAssetId) }))
    .filter((item): item is typeof item & { file: NonNullable<typeof item.file> } => Boolean(item.file))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app/marketing" />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="text-sm text-slate-500">Approved project</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{task.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review project details and upload task media from here.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <MarketingProjectDetailEditor
          task={{
            id: task.id,
            title: task.title,
            brief: task.brief,
            assignee: task.assignee ?? null,
            dueAt: task.dueAt?.toISOString() ?? null,
            links,
            status: task.status,
          }}
        />
        <aside className="space-y-6">
          <MarketingMediaPanel tasks={[{ id: task.id, title: task.title }]} />
          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Task media</h2>
              <p className="mt-1 text-sm text-slate-500">{media.length} uploaded file{media.length === 1 ? "" : "s"}</p>
            </div>
            {media.length ? (
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1">
                {media.map((item) => {
                  const inlineUrl = `/api/v1/files/${item.file.id}/download?disposition=inline&proxy=1`;
                  return (
                    <article className="overflow-hidden rounded-lg border border-slate-200" key={item.id}>
                      <a className="flex aspect-video items-center justify-center bg-slate-50" href={inlineUrl} target="_blank" rel="noreferrer">
                        {item.file.mimeType.startsWith("image/") ? (
                          <img className="h-full w-full object-contain" src={inlineUrl} alt={item.file.fileName} />
                        ) : item.file.mimeType.startsWith("video/") ? (
                          <video className="h-full w-full object-contain" src={inlineUrl} controls preload="metadata" />
                        ) : (
                          <FileText className="text-slate-400" size={38} />
                        )}
                      </a>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium" title={item.file.fileName}>{item.file.fileName}</div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              {item.file.mimeType.startsWith("image/") ? <ImageIcon size={12} /> : item.file.mimeType.startsWith("video/") ? <Film size={12} /> : <FileText size={12} />}
                              {mediaKindLabel(item.kind)} · Version {item.version}
                            </div>
                          </div>
                          <span className="chip bg-slate-100 text-slate-700">{item.kind}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          <a className="btn-outline h-8 px-2 text-xs" href={`/api/v1/files/${item.file.id}/download`}>
                            <Download size={13} />
                            Download
                          </a>
                          <FileActions fileId={item.file.id} fileName={item.file.fileName} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">No task media uploaded yet.</div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function mediaKindLabel(kind: string) {
  if (kind === "RAW") return "Raw footage";
  if (kind === "DRAFT") return "Editor draft";
  if (kind === "FINAL") return "Final video";
  return kind;
}
