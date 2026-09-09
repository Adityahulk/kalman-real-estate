import { ArchiveRestore } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { ArchiveRecords, type ArchiveRecord } from "./archive-actions";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const session = await requirePagePermission("records.restore");
  const [documents, files, plots, marketingTasks, dismissals] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { tenantId: session.tenantId, archivedAt: { not: null } },
      select: { id: true, number: true, type: true, status: true, archivedAt: true, archiveReason: true },
      orderBy: { archivedAt: "desc" }, take: 250,
    }),
    prisma.fileAsset.findMany({
      where: {
        tenantId: session.tenantId,
        deletedAt: { not: null },
        deleteReason: { not: "Replaced by the authoritative signed ownership letter" },
      },
      select: { id: true, fileName: true, version: true, deletedAt: true, deleteReason: true },
      orderBy: { deletedAt: "desc" }, take: 250,
    }),
    prisma.plot.findMany({
      where: { tenantId: session.tenantId, archivedAt: { not: null } },
      select: { id: true, code: true, project: { select: { name: true } }, archivedAt: true, archiveReason: true },
      orderBy: { archivedAt: "desc" }, take: 250,
    }),
    prisma.marketingTask.findMany({
      where: { tenantId: session.tenantId, archivedAt: { not: null } },
      select: { id: true, title: true, status: true, archivedAt: true, archiveReason: true },
      orderBy: { archivedAt: "desc" }, take: 250,
    }),
    prisma.archiveDismissal.findMany({
      where: { tenantId: session.tenantId },
      select: { recordType: true, recordId: true, archiveVersion: true },
    }),
  ]);
  const hidden = new Set(dismissals.map((item) => archiveKey(item.recordType, item.recordId, item.archiveVersion)));
  const records: ArchiveRecord[] = [
    ...plots.flatMap((plot) => plot.archivedAt && !hidden.has(archiveKey("Plot", plot.id, plot.archivedAt)) ? [{
      id: plot.id, recordType: "Plot" as const, section: "Plots" as const,
      title: plot.code.split("__deleted__")[0], subtitle: `${plot.project.name} · ${plot.archiveReason ?? "Archived"}`,
      archiveVersion: plot.archivedAt.toISOString(), restoreEndpoint: `/api/v1/plots/${plot.id}/restore`,
    }] : []),
    ...documents.flatMap((document) => document.archivedAt && !hidden.has(archiveKey("GeneratedDocument", document.id, document.archivedAt)) ? [{
      id: document.id, recordType: "GeneratedDocument" as const, section: "Generated documents" as const,
      title: document.number ?? document.type, subtitle: `${document.type} · ${document.status} · ${document.archiveReason ?? "Archived"}`,
      archiveVersion: document.archivedAt.toISOString(), restoreEndpoint: `/api/v1/documents/${document.id}/restore`,
    }] : []),
    ...files.flatMap((file) => file.deletedAt && !hidden.has(archiveKey("FileAsset", file.id, file.deletedAt)) ? [{
      id: file.id, recordType: "FileAsset" as const, section: "Files" as const,
      title: file.fileName, subtitle: `Version ${file.version} · ${file.deleteReason ?? "Archived"}`,
      archiveVersion: file.deletedAt.toISOString(), restoreEndpoint: `/api/v1/files/${file.id}/restore`,
    }] : []),
    ...marketingTasks.flatMap((task) => task.archivedAt && !hidden.has(archiveKey("MarketingTask", task.id, task.archivedAt)) ? [{
      id: task.id, recordType: "MarketingTask" as const, section: "Marketing projects" as const,
      title: task.title, subtitle: `${task.status} · ${task.archiveReason ?? "Archived"}`,
      archiveVersion: task.archivedAt.toISOString(), restoreEndpoint: `/api/v1/marketing/tasks/${task.id}/restore`,
    }] : []),
  ];

  return (
    <main className="px-4 py-6 lg:px-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <ArchiveRestore size={22} className="text-navy-800" />
          <h1 className="text-3xl font-semibold tracking-tight">Archived records</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Restore operational records or clear them from this working view. Clearing does not erase legal data or its audit trail.
        </p>
      </header>
      <ArchiveRecords records={records} />
    </main>
  );
}

function archiveKey(recordType: string, recordId: string, archiveVersion: Date) {
  return `${recordType}/${recordId}/${archiveVersion.toISOString()}`;
}
