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
  await prisma.auditEvent.deleteMany({ where: { id, tenantId: context.tenantId } });
  return { id };
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
      select: { id: true, fileAssetId: true },
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
      ...revisions.flatMap((revision) => [revision.baseFileId, revision.outputFileId]).filter((id): id is string => Boolean(id)),
    ]);
    const fileFilters: Prisma.FileAssetWhereInput[] = [
      { ownerType: "Plot", ownerId: plot.id, categoryKey: { in: ["signed-allotment-letter", "allotment-payment", "allotment-extra"] } },
      { ownerType: "Plot", ownerId: plot.id, categoryKey: { startsWith: "manual-letter-" } },
      { ownerType: "Plot", ownerId: plot.id, documentType: RealEstateDocumentType.ALLOTMENT_LETTER },
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

    const auditDelete = await tx.auditEvent.deleteMany({ where: { tenantId: context.tenantId, OR: auditFilters } });
    const approvalDelete = documentIds.length
      ? await tx.approval.deleteMany({ where: { tenantId: context.tenantId, recordType: "GeneratedDocument", recordId: { in: documentIds } } })
      : { count: 0 };
    if (documentIds.length) {
      await tx.ownershipRecord.updateMany({
        where: { tenantId: context.tenantId, documentId: { in: documentIds } },
        data: { documentId: null },
      });
    }
    const revisionDelete = documentIds.length
      ? await tx.generatedDocumentRevision.deleteMany({ where: { tenantId: context.tenantId, documentId: { in: documentIds } } })
      : { count: 0 };
    const documentDelete = documentIds.length
      ? await tx.generatedDocument.deleteMany({ where: { tenantId: context.tenantId, id: { in: documentIds } } })
      : { count: 0 };
    const registryDelete = await tx.registryRecord.deleteMany({ where: { tenantId: context.tenantId, plotId: plot.id } });
    const ownershipDelete = await tx.ownershipRecord.deleteMany({ where: { tenantId: context.tenantId, plotId: plot.id } });
    const fileDelete = fileIds.length
      ? await tx.fileAsset.deleteMany({ where: { tenantId: context.tenantId, id: { in: fileIds } } })
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
      auditDeleted: auditDelete.count,
      approvalsDeleted: approvalDelete.count,
      revisionsDeleted: revisionDelete.count,
      documentsDeleted: documentDelete.count,
      registryDeleted: registryDelete.count,
      ownershipDeleted: ownershipDelete.count,
      filesDeleted: fileDelete.count,
    };
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
