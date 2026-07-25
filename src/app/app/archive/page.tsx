import { ArchiveRestore } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { RestoreButton } from "./archive-actions";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const session = await requirePagePermission("records.restore");
  const [documents, files, plots, marketingTasks] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { tenantId: session.tenantId, archivedAt: { not: null } },
      select: { id: true, number: true, type: true, status: true, archivedAt: true, archiveReason: true },
      orderBy: { archivedAt: "desc" },
      take: 250,
    }),
    prisma.fileAsset.findMany({
      where: { tenantId: session.tenantId, deletedAt: { not: null } },
      select: { id: true, fileName: true, version: true, deletedAt: true, deleteReason: true },
      orderBy: { deletedAt: "desc" },
      take: 250,
    }),
    prisma.plot.findMany({
      where: { tenantId: session.tenantId, archivedAt: { not: null } },
      select: { id: true, code: true, project: { select: { name: true } }, archivedAt: true, archiveReason: true },
      orderBy: { archivedAt: "desc" },
      take: 250,
    }),
    prisma.marketingTask.findMany({
      where: { tenantId: session.tenantId, archivedAt: { not: null } },
      select: { id: true, title: true, status: true, archivedAt: true, archiveReason: true },
      orderBy: { archivedAt: "desc" },
      take: 250,
    }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <ArchiveRestore size={22} className="text-navy-800" />
          <h1 className="text-3xl font-semibold tracking-tight">Archived records</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Legal and operational records remain preserved after removal. Restore them here without losing their audit history.
        </p>
      </header>

      <div className="space-y-6">
        <ArchiveSection title="Plots">
          {plots.map((plot) => (
            <ArchiveRow
              key={plot.id}
              title={plot.code.split("__deleted__")[0]}
              subtitle={`${plot.project.name} · ${plot.archiveReason ?? "Archived"}`}
              date={plot.archivedAt}
              action={<RestoreButton endpoint={`/api/v1/plots/${plot.id}/restore`} label={`plot ${plot.code.split("__deleted__")[0]}`} />}
            />
          ))}
          {!plots.length ? <EmptyRow text="No archived plots." /> : null}
        </ArchiveSection>

        <ArchiveSection title="Generated documents">
          {documents.map((document) => (
            <ArchiveRow
              key={document.id}
              title={document.number ?? document.type}
              subtitle={`${document.type} · ${document.status} · ${document.archiveReason ?? "Archived"}`}
              date={document.archivedAt}
              action={<RestoreButton endpoint={`/api/v1/documents/${document.id}/restore`} label={document.number ?? document.type} />}
            />
          ))}
          {!documents.length ? <EmptyRow text="No archived documents." /> : null}
        </ArchiveSection>

        <ArchiveSection title="Files">
          {files.map((file) => (
            <ArchiveRow
              key={file.id}
              title={file.fileName}
              subtitle={`Version ${file.version} · ${file.deleteReason ?? "Archived"}`}
              date={file.deletedAt}
              action={<RestoreButton endpoint={`/api/v1/files/${file.id}/restore`} label={file.fileName} />}
            />
          ))}
          {!files.length ? <EmptyRow text="No archived files." /> : null}
        </ArchiveSection>

        <ArchiveSection title="Marketing projects">
          {marketingTasks.map((task) => (
            <ArchiveRow
              key={task.id}
              title={task.title}
              subtitle={`${task.status} · ${task.archiveReason ?? "Archived"}`}
              date={task.archivedAt}
              action={<RestoreButton endpoint={`/api/v1/marketing/tasks/${task.id}/restore`} label={task.title} />}
            />
          ))}
          {!marketingTasks.length ? <EmptyRow text="No archived marketing projects." /> : null}
        </ArchiveSection>
      </div>
    </main>
  );
}

function ArchiveSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function ArchiveRow({
  title,
  subtitle,
  date,
  action,
}: {
  title: string;
  subtitle: string;
  date: Date | null;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="break-words font-medium">{title}</div>
        <div className="mt-1 break-words text-xs text-slate-500">{subtitle}</div>
        <div className="mt-1 text-xs text-slate-400">{date ? date.toLocaleString("en-IN") : "Archive date unavailable"}</div>
      </div>
      {action}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-sm text-slate-500">{text}</div>;
}
