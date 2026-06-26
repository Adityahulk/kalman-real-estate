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
    select: { id: true, currentOwnerId: true },
  });

  const documents = await prisma.generatedDocument.findMany({
    where: { tenantId: context.tenantId, recordType: "Plot", recordId: plot.id },
    select: { id: true, fileAssetId: true },
  });
  const documentIds = documents.map((document) => document.id);
  const documentFileIds = documents.map((document) => document.fileAssetId).filter((id): id is string => Boolean(id));

  // Delete generated document revisions, then documents themselves
  if (documentIds.length) {
    await prisma.generatedDocumentRevision.deleteMany({ where: { tenantId: context.tenantId, documentId: { in: documentIds } } });
    // Detach ownership records before deleting documents
    await prisma.ownershipRecord.updateMany({ where: { tenantId: context.tenantId, documentId: { in: documentIds } }, data: { documentId: null } });
    await prisma.generatedDocument.deleteMany({ where: { tenantId: context.tenantId, id: { in: documentIds } } });
  }

  // Soft-delete signed allotment letters + allotment supporting files (not plot maps or other files)
  await prisma.fileAsset.updateMany({
    where: {
      tenantId: context.tenantId,
      ownerType: "Plot",
      ownerId: plot.id,
      categoryKey: { in: ["signed-allotment-letter", "allotment-payment", "allotment-extra"] },
      deletedAt: null,
    },
    data: { deletedAt: new Date(), deleteReason: "Plot history cleanup" },
  });
  // Soft-delete generated document PDFs
  if (documentFileIds.length) {
    await prisma.fileAsset.updateMany({
      where: { tenantId: context.tenantId, id: { in: documentFileIds }, deletedAt: null },
      data: { deletedAt: new Date(), deleteReason: "Plot history cleanup" },
    });
  }
  // Soft-delete allottee KYC files
  if (plot.currentOwnerId) {
    await prisma.fileAsset.updateMany({
      where: { tenantId: context.tenantId, ownerType: "Owner", ownerId: plot.currentOwnerId, categoryKey: "allottee-kyc", deletedAt: null },
      data: { deletedAt: new Date(), deleteReason: "Plot history cleanup" },
    });
  }

  // Delete ownership records (allotment/transfer) and revert plot to company inventory
  await prisma.ownershipRecord.deleteMany({
    where: { tenantId: context.tenantId, plotId: plot.id, kind: { in: ["ALLOTMENT", "TRANSFER"] } },
  });
  await prisma.plot.update({
    where: { id: plot.id },
    data: { currentOwnerId: null, status: "COMPANY_OWNED" },
  });

  // Clean up audit logs
  const allFileIds = [
    ...documentFileIds,
    ...(await prisma.fileAsset.findMany({
      where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: plot.id },
      select: { id: true },
    })).map((file) => file.id),
  ];
  const result = await prisma.auditEvent.deleteMany({
    where: {
      tenantId: context.tenantId,
      OR: [
        { entityType: "Plot", entityId: plot.id },
        ...(documentIds.length ? [{ entityType: "GeneratedDocument", entityId: { in: documentIds } }] : []),
        ...(allFileIds.length ? [{ entityType: "FileAsset", entityId: { in: allFileIds } }] : []),
      ],
    },
  });
  return { plotId: plot.id, deleted: result.count };
}
