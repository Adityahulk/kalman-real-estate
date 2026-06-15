import { prisma } from "../db";
import { RequestContext } from "../api";

export async function getPlotWorkspace(context: RequestContext, plotId: string) {
  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    include: {
      project: true,
      currentOwner: true,
      ownershipRecords: { include: { owner: true, createdBy: { select: { name: true, email: true } } }, orderBy: { effectiveAt: "desc" } },
      registryRecords: { orderBy: { createdAt: "desc" } },
      checklistItems: { orderBy: [{ category: "asc" }, { label: "asc" }] },
    },
  });

  const checklistIds = plot.checklistItems.map((item) => item.id);
  const [
    generatedDocuments,
    plotFiles,
    ownerFiles,
    progressUpdates,
    issues,
    auditEvents,
    spatialLinks,
    childCadFiles,
  ] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { tenantId: context.tenantId, recordType: "Plot", recordId: plot.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fileAsset.findMany({
      where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: plot.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    plot.currentOwnerId
      ? prisma.fileAsset.findMany({
          where: { tenantId: context.tenantId, ownerType: "Owner", ownerId: plot.currentOwnerId, deletedAt: null },
          orderBy: { createdAt: "desc" },
        })
      : [],
    prisma.progressUpdate.findMany({
      where: {
        tenantId: context.tenantId,
        OR: [
          { parentType: "Plot", parentId: plot.id },
          { parentType: "ChecklistItem", parentId: { in: checklistIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.issue.findMany({
      where: {
        tenantId: context.tenantId,
        OR: [
          { parentType: "Plot", parentId: plot.id },
          { parentType: "ChecklistItem", parentId: { in: checklistIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.auditEvent.findMany({
      where: {
        tenantId: context.tenantId,
        OR: [
          { entityType: "Plot", entityId: plot.id },
          { entityType: "GeneratedDocument", entityId: { in: [] } },
        ],
      },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.spatialLink.findMany({
      where: { tenantId: context.tenantId, recordType: "Plot", recordId: plot.id },
      include: { entity: { include: { scene: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cadFile.findMany({
      where: { tenantId: context.tenantId, parentType: "PLOT", parentId: plot.id },
      include: { scenes: { take: 1, orderBy: { createdAt: "desc" } }, reviewIssues: { where: { resolved: false } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const documentIds = generatedDocuments.map((document) => document.id);
  const historicalFiles = await prisma.fileAsset.findMany({
    where: {
      tenantId: context.tenantId,
      OR: [
        { ownerType: "Plot", ownerId: plot.id },
        ...(plot.currentOwnerId ? [{ ownerType: "Owner", ownerId: plot.currentOwnerId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  const fileIds = historicalFiles.map((file) => file.id);
  const documentAudit = documentIds.length
    ? await prisma.auditEvent.findMany({
        where: { tenantId: context.tenantId, entityType: "GeneratedDocument", entityId: { in: documentIds } },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];
  const fileAudit = fileIds.length
    ? await prisma.auditEvent.findMany({
        where: { tenantId: context.tenantId, entityType: "FileAsset", entityId: { in: fileIds } },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];

  const timeline = [
    ...plot.ownershipRecords.map((record) => ({
      id: `ownership-${record.id}`,
      at: record.effectiveAt,
      type: record.kind,
      title: `${record.kind.replaceAll("_", " ")} · ${record.owner?.name ?? "Company inventory"}`,
      detail: [record.notes, record.createdBy ? `Done by ${record.createdBy.name}` : null].filter(Boolean).join(" · ") || null,
    })),
    ...plot.registryRecords.map((record) => ({
      id: `registry-${record.id}`,
      at: record.createdAt,
      type: "REGISTRY",
      title: `${record.status}${record.registryNo ? ` · ${record.registryNo}` : ""}`,
      detail: record.notes ?? null,
    })),
    ...generatedDocuments.map((document) => ({
      id: `document-${document.id}`,
      at: document.createdAt,
      type: "DOCUMENT",
      title: `${document.type.replaceAll("_", " ")} · ${document.status}`,
      detail: document.number ?? null,
    })),
    ...historicalFiles.map((file) => ({
      id: `file-${file.id}`,
      at: file.createdAt,
      type: "FILE_UPLOAD",
      title: `${file.documentType?.replaceAll("_", " ") ?? "Document"} uploaded${file.deletedAt ? " (deleted later)" : ""}`,
      detail: [
        file.fileName,
        file.documentNo ? `Ref: ${file.documentNo}` : null,
        file.documentDate ? `Date: ${file.documentDate.toLocaleDateString("en-IN")}` : null,
        `Visibility: ${file.visibility.replaceAll("_", " ")}`,
        file.deletedAt ? `Deleted: ${file.deletedAt.toLocaleString("en-IN")}` : null,
        file.deleteReason ? `Delete reason: ${file.deleteReason}` : null,
        file.notes ? `Notes: ${file.notes}` : null,
      ].filter(Boolean).join(" · "),
    })),
    ...auditEvents.concat(documentAudit, fileAudit).map((event) => ({
      id: `audit-${event.id}`,
      at: event.createdAt,
      type: "AUDIT",
      title: `${event.action} · ${event.entityType}${event.actor ? ` · ${event.actor.name}` : ""}`,
      detail: [event.entityId, event.actor?.email ? `Actor: ${event.actor.email}` : null].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    plot,
    generatedDocuments,
    plotFiles,
    ownerFiles,
    progressUpdates,
    issues,
    auditEvents,
    spatialLinks,
    childCadFiles,
    timeline,
  };
}
