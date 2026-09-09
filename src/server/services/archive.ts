import { AuditAction } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";

const archiveRecordTypeSchema = z.enum(["Plot", "GeneratedDocument", "FileAsset", "MarketingTask"]);
const archiveItemSchema = z.object({
  recordType: archiveRecordTypeSchema,
  recordId: z.string().min(1),
  archiveVersion: z.string().datetime(),
});

export const clearArchiveSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("selected"), items: z.array(archiveItemSchema).min(1).max(500) }),
  z.object({ mode: z.literal("all") }),
]);

export async function clearArchiveView(context: RequestContext, input: z.infer<typeof clearArchiveSchema>) {
  const candidates = input.mode === "all"
    ? await allArchivedItems(context.tenantId)
    : input.items.map((item) => ({ ...item, archiveVersion: new Date(item.archiveVersion) }));
  const valid = await validArchivedItems(context.tenantId, candidates);
  if (valid.length) {
    await prisma.archiveDismissal.createMany({
      data: valid.map((item) => ({
        tenantId: context.tenantId,
        recordType: item.recordType,
        recordId: item.recordId,
        archiveVersion: item.archiveVersion,
        clearedById: context.userId,
      })),
      skipDuplicates: true,
    });
  }
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "ArchiveView",
    entityId: context.tenantId,
    after: { mode: input.mode, clearedCount: valid.length },
  });
  return { clearedCount: valid.length };
}

type ArchiveItem = { recordType: z.infer<typeof archiveRecordTypeSchema>; recordId: string; archiveVersion: Date };

async function allArchivedItems(tenantId: string): Promise<ArchiveItem[]> {
  const [plots, documents, files, marketingTasks] = await Promise.all([
    prisma.plot.findMany({ where: { tenantId, archivedAt: { not: null } }, select: { id: true, archivedAt: true } }),
    prisma.generatedDocument.findMany({ where: { tenantId, archivedAt: { not: null } }, select: { id: true, archivedAt: true } }),
    prisma.fileAsset.findMany({ where: { tenantId, deletedAt: { not: null } }, select: { id: true, deletedAt: true } }),
    prisma.marketingTask.findMany({ where: { tenantId, archivedAt: { not: null } }, select: { id: true, archivedAt: true } }),
  ]);
  return [
    ...plots.flatMap((item) => item.archivedAt ? [{ recordType: "Plot" as const, recordId: item.id, archiveVersion: item.archivedAt }] : []),
    ...documents.flatMap((item) => item.archivedAt ? [{ recordType: "GeneratedDocument" as const, recordId: item.id, archiveVersion: item.archivedAt }] : []),
    ...files.flatMap((item) => item.deletedAt ? [{ recordType: "FileAsset" as const, recordId: item.id, archiveVersion: item.deletedAt }] : []),
    ...marketingTasks.flatMap((item) => item.archivedAt ? [{ recordType: "MarketingTask" as const, recordId: item.id, archiveVersion: item.archivedAt }] : []),
  ];
}

async function validArchivedItems(tenantId: string, candidates: ArchiveItem[]) {
  const ids = (recordType: ArchiveItem["recordType"]) => candidates
    .filter((item) => item.recordType === recordType)
    .map((item) => item.recordId);
  const [plots, documents, files, marketingTasks] = await Promise.all([
    prisma.plot.findMany({ where: { tenantId, id: { in: ids("Plot") }, archivedAt: { not: null } }, select: { id: true, archivedAt: true } }),
    prisma.generatedDocument.findMany({ where: { tenantId, id: { in: ids("GeneratedDocument") }, archivedAt: { not: null } }, select: { id: true, archivedAt: true } }),
    prisma.fileAsset.findMany({ where: { tenantId, id: { in: ids("FileAsset") }, deletedAt: { not: null } }, select: { id: true, deletedAt: true } }),
    prisma.marketingTask.findMany({ where: { tenantId, id: { in: ids("MarketingTask") }, archivedAt: { not: null } }, select: { id: true, archivedAt: true } }),
  ]);
  const activeArchiveKeys = new Set([
    ...plots.flatMap((item) => item.archivedAt ? [itemKey("Plot", item.id, item.archivedAt)] : []),
    ...documents.flatMap((item) => item.archivedAt ? [itemKey("GeneratedDocument", item.id, item.archivedAt)] : []),
    ...files.flatMap((item) => item.deletedAt ? [itemKey("FileAsset", item.id, item.deletedAt)] : []),
    ...marketingTasks.flatMap((item) => item.archivedAt ? [itemKey("MarketingTask", item.id, item.archivedAt)] : []),
  ]);
  const unique = new Map<string, ArchiveItem>();
  for (const item of candidates) {
    const key = itemKey(item.recordType, item.recordId, item.archiveVersion);
    if (activeArchiveKeys.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

function itemKey(recordType: string, recordId: string, archiveVersion: Date) {
  return `${recordType}/${recordId}/${archiveVersion.toISOString()}`;
}
