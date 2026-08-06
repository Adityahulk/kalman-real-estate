import { AuditAction, OwnershipKind, PlotStatus, Prisma, RealEstateDocumentType } from "@prisma/client";
import { prisma } from "./db";
import { RequestContext } from "./api";

export async function writeAuditEvent(
  context: RequestContext,
  input: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  return prisma.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });
}

export async function deleteAuditEvent(context: RequestContext, id: string) {
  const event = await prisma.auditEvent.findFirstOrThrow({ where: { id, tenantId: context.tenantId, archivedAt: null } });
  await prisma.auditEvent.update({
    where: { id: event.id },
    data: {
      archivedAt: new Date(),
      archivedById: context.userId,
      archiveReason: "Archived by an authorized administrator.",
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "AuditEvent",
    entityId: id,
    before: event as unknown as Prisma.InputJsonValue,
    after: { archived: true } as Prisma.InputJsonValue,
  });
  return { id, archived: true };
}

export async function cleanPlotAuditEvents(context: RequestContext, plotId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const plot = await tx.plot.findFirstOrThrow({
      where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
      select: { id: true },
    });
    const records = await tx.ownershipRecord.findMany({
      where: { tenantId: context.tenantId, plotId: plot.id },
      select: { id: true, extraDetails: true },
    });
    const documents = await tx.generatedDocument.findMany({
      where: { tenantId: context.tenantId, recordType: "Plot", recordId: plot.id },
      select: { id: true, fileAssetId: true, signedFileAssetId: true },
    });
    const documentIds = documents.map((document) => document.id);
    const revisions = documentIds.length
      ? await tx.generatedDocumentRevision.findMany({
          where: { tenantId: context.tenantId, documentId: { in: documentIds } },
          select: { baseFileId: true, outputFileId: true },
        })
      : [];

    const fileIdsFromRecords = records.flatMap((record) => collectFileIds(record.extraDetails));
    const generatedFileIds = unique([
      ...documents.map((document) => document.fileAssetId).filter((id): id is string => Boolean(id)),
      ...documents.map((document) => document.signedFileAssetId).filter((id): id is string => Boolean(id)),
      ...revisions.flatMap((revision) => [revision.baseFileId, revision.outputFileId]).filter((id): id is string => Boolean(id)),
    ]);
    const fileFilters: Prisma.FileAssetWhereInput[] = [
      { ownerType: "Plot", ownerId: plot.id, categoryKey: { in: ["signed-allotment-letter", "signed-transfer-letter", "allotment-payment", "allotment-extra"] } },
      { ownerType: "Plot", ownerId: plot.id, categoryKey: { startsWith: "manual-letter-" } },
      { ownerType: "Plot", ownerId: plot.id, documentType: { in: [RealEstateDocumentType.ALLOTMENT_LETTER, RealEstateDocumentType.TRANSFER_LETTER] } },
    ];
    if (fileIdsFromRecords.length || generatedFileIds.length) {
      fileFilters.push({ id: { in: unique([...fileIdsFromRecords, ...generatedFileIds]) } });
    }
    const files = await tx.fileAsset.findMany({
      where: { tenantId: context.tenantId, OR: fileFilters },
      select: { id: true },
    });

    const fileIds = files.map((file) => file.id);
    const auditFilters: Prisma.AuditEventWhereInput[] = [{ entityType: "Plot", entityId: plot.id }];
    if (documentIds.length) auditFilters.push({ entityType: "GeneratedDocument", entityId: { in: documentIds } });
    if (fileIds.length) auditFilters.push({ entityType: "FileAsset", entityId: { in: fileIds } });

    const now = new Date();
    const auditArchive = await tx.auditEvent.updateMany({
      where: { tenantId: context.tenantId, archivedAt: null, OR: auditFilters },
      data: {
        archivedAt: now,
        archivedById: context.userId,
        archiveReason: "Plot history cleanup",
      },
    });
    const documentArchive = documentIds.length
      ? await tx.generatedDocument.updateMany({
          where: { tenantId: context.tenantId, id: { in: documentIds }, archivedAt: null },
          data: { archivedAt: now, archivedById: context.userId, archiveReason: "Plot history cleanup" },
        })
      : { count: 0 };
    const registryArchive = await tx.registryRecord.updateMany({
      where: { tenantId: context.tenantId, plotId: plot.id, archivedAt: null },
      data: { archivedAt: now, archivedById: context.userId, archiveReason: "Plot history cleanup" },
    });
    const ownershipArchive = await tx.ownershipRecord.updateMany({
      where: { tenantId: context.tenantId, plotId: plot.id, cancelledAt: null },
      data: { cancelledAt: now, cancelledById: context.userId, cancellationReason: "Plot history cleanup" },
    });
    const fileArchive = fileIds.length
      ? await tx.fileAsset.updateMany({
          where: { tenantId: context.tenantId, id: { in: fileIds }, deletedAt: null },
          data: { deletedAt: now, deletedById: context.userId, deleteReason: "Plot history cleanup" },
        })
      : { count: 0 };

    await tx.plot.update({
      where: { id: plot.id },
      data: { currentOwnerId: null, status: PlotStatus.COMPANY_OWNED },
      select: { id: true },
    });
    await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId: plot.id,
        kind: OwnershipKind.COMPANY_INVENTORY,
        sharePct: new Prisma.Decimal(100),
        notes: "Reset by plot history cleanup.",
        createdById: context.userId,
      },
    });

    return {
      plotId: plot.id,
      auditArchived: auditArchive.count,
      documentsArchived: documentArchive.count,
      registryArchived: registryArchive.count,
      ownershipArchived: ownershipArchive.count,
      filesArchived: fileArchive.count,
    };
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "Plot",
    entityId: plotId,
    after: {
      operation: "ARCHIVE_HISTORY",
      ...result,
    } as unknown as Prisma.InputJsonValue,
  });
  return result;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function collectFileIds(value: Prisma.JsonValue | null): string[] {
  const ids = new Set<string>();
  visitJson(value, ids);
  return [...ids];
}

function visitJson(value: Prisma.JsonValue | null, ids: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) visitJson(item, ids);
    return;
  }
  const record = value as Record<string, Prisma.JsonValue>;
  const id = record.id;
  if (typeof id === "string" && (typeof record.fileName === "string" || typeof record.mimeType === "string" || typeof record.storageKey === "string")) {
    ids.add(id);
  }
  for (const item of Object.values(record)) visitJson(item, ids);
}
