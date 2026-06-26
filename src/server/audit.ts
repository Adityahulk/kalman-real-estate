import { AuditAction, Prisma } from "@prisma/client";
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
  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    select: { id: true },
  });
  const documents = await prisma.generatedDocument.findMany({
    where: { tenantId: context.tenantId, recordType: "Plot", recordId: plot.id },
    select: { id: true, fileAssetId: true },
  });
  const plotFiles = await prisma.fileAsset.findMany({
    where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: plot.id },
    select: { id: true },
  });
  const documentIds = documents.map((document) => document.id);
  const fileIds = [
    ...plotFiles.map((file) => file.id),
    ...documents.map((document) => document.fileAssetId).filter((id): id is string => Boolean(id)),
  ];
  const result = await prisma.auditEvent.deleteMany({
    where: {
      tenantId: context.tenantId,
      OR: [
        { entityType: "Plot", entityId: plot.id },
        ...(documentIds.length ? [{ entityType: "GeneratedDocument", entityId: { in: documentIds } }] : []),
        ...(fileIds.length ? [{ entityType: "FileAsset", entityId: { in: fileIds } }] : []),
      ],
    },
  });
  return { plotId: plot.id, deleted: result.count };
}
