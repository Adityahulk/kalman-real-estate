import { prisma } from "../db";
import { RequestContext } from "../api";

export async function getPlotWorkspace(context: RequestContext, plotId: string) {
  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    include: {
      project: true,
      currentOwner: true,
      ownershipRecords: {
        where: { cancelledAt: null },
        include: { owner: true, createdBy: { select: { name: true, email: true } } },
        orderBy: { effectiveAt: "desc" },
      },
      registryRecords: { where: { archivedAt: null }, orderBy: { createdAt: "desc" } },
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
      where: { tenantId: context.tenantId, recordType: "Plot", recordId: plot.id, archivedAt: null },
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
        archivedAt: null,
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
      include: {
        analysis: { select: { previewArtifactKey: true } },
        scenes: { take: 1, orderBy: { createdAt: "desc" } },
        reviewIssues: { where: { resolved: false } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const documentIds = generatedDocuments.map((document) => document.id);
  const allotmentSupportingFileIds = unique(
    plot.ownershipRecords
      .filter((record) => record.kind === "ALLOTMENT" || record.kind === "TRANSFER")
      .flatMap((record) => collectFileIds(record.extraDetails)),
  );
  const historicalFiles = await prisma.fileAsset.findMany({
    where: {
      tenantId: context.tenantId,
      deletedAt: null,
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
        where: { tenantId: context.tenantId, entityType: "GeneratedDocument", entityId: { in: documentIds }, archivedAt: null },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];
  const fileAudit = fileIds.length
    ? await prisma.auditEvent.findMany({
        where: { tenantId: context.tenantId, entityType: "FileAsset", entityId: { in: fileIds }, archivedAt: null },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];
  const allotmentSupportingFiles = allotmentSupportingFileIds.length
    ? await prisma.fileAsset.findMany({
        where: { tenantId: context.tenantId, id: { in: allotmentSupportingFileIds }, deletedAt: null },
        orderBy: { createdAt: "desc" },
      })
    : [];

  type TimelineItem = {
    id: string;
    at: Date;
    type: string;
    title: string;
    detail: string | null;
    actor: string | null;
    fileAssetId: string | null;
    documentId: string | null;
    auditId: string | null;
  };
  const base = { detail: null, actor: null, fileAssetId: null, documentId: null, auditId: null };
  const timeline: TimelineItem[] = [
    ...plot.ownershipRecords.map((record) => ({
      ...base,
      id: `ownership-${record.id}`,
      at: record.effectiveAt,
      type: record.kind,
      title: `${record.kind.replaceAll("_", " ")} · ${record.owner?.name ?? "Company inventory"}`,
      detail: record.notes ?? null,
      actor: record.createdBy?.name ?? null,
    })),
    ...plot.registryRecords.map((record) => ({
      ...base,
      id: `registry-${record.id}`,
      at: record.createdAt,
      type: "REGISTRY",
      title: `Registry ${record.status}${record.registryNo ? ` · ${record.registryNo}` : ""}`,
      detail: record.notes ?? null,
    })),
    ...generatedDocuments.map((document) => ({
      ...base,
      id: `document-${document.id}`,
      at: document.createdAt,
      type: "DOCUMENT",
      title: `${document.type.replaceAll("_", " ")} · ${document.status}`,
      detail: document.number ?? null,
      fileAssetId: document.fileAssetId ?? null,
      documentId: document.id,
    })),
    ...historicalFiles.map((file) => ({
      ...base,
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
      fileAssetId: file.deletedAt ? null : file.id,
    })),
    ...auditEvents.concat(documentAudit, fileAudit).map((event) => ({
      ...base,
      id: `audit-${event.id}`,
      at: event.createdAt,
      type: "AUDIT",
      title: `${event.action} · ${event.entityType.replaceAll("_", " ")}`,
      detail: event.entityId,
      actor: event.actor?.name ?? event.actor?.email ?? null,
      auditId: event.id,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    plot,
    generatedDocuments,
    plotFiles,
    ownerFiles,
    allotmentSupportingFiles,
    progressUpdates,
    issues,
    auditEvents,
    spatialLinks,
    childCadFiles,
    timeline,
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function collectFileIds(value: unknown): string[] {
  const ids = new Set<string>();
  visit(value, ids);
  return [...ids];
}

function visit(value: unknown, ids: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) visit(item, ids);
    return;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id === "string" &&
    (typeof record.fileName === "string" || typeof record.mimeType === "string" || typeof record.storageKey === "string")
  ) {
    ids.add(record.id);
  }
  for (const item of Object.values(record)) visit(item, ids);
}
