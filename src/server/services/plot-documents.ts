import type {
  FileAsset,
  GeneratedDocument,
  OwnershipKind,
  PlotStatus,
  RealEstateDocumentType,
} from "@prisma/client";
import { prisma } from "../db";

export type PlotDocumentKind = "REGISTRY" | "TRANSFER" | "ALLOTMENT" | "SUPPORTING";

export type PlotDocumentHistoryItem = {
  id: string;
  plotId: string;
  kind: PlotDocumentKind;
  label: string;
  number: string | null;
  documentDate: Date;
  ownerId: string | null;
  ownerName: string | null;
  uploadedAt: Date | null;
  uploadedBy: string | null;
  fileAssetId: string | null;
  generatedFileAssetId: string | null;
  generatedDocumentId: string | null;
  status: string;
  version: number;
  signed: boolean;
  missing: boolean;
  latest: boolean;
};

export type PlotDocumentState = {
  plotId: string;
  plotStatus: PlotStatus;
  currentOwnerId: string | null;
  currentOwnerName: string | null;
  latestDocument: PlotDocumentHistoryItem | null;
  history: PlotDocumentHistoryItem[];
  signedAllotmentAvailable: boolean;
  registryDocumentAvailable: boolean;
};

type PlotIdentity = {
  id: string;
  status: PlotStatus;
  currentOwnerId: string | null;
  currentOwnerName: string | null;
};

const ownershipTypes = new Set<RealEstateDocumentType>(["ALLOTMENT_LETTER", "TRANSFER_LETTER"]);
const registryTypes = new Set<RealEstateDocumentType>(["REGISTRY_RECEIPT", "REGISTRY_DEED"]);

export async function getPlotDocumentState(tenantId: string, plotId: string) {
  const states = await getPlotDocumentStates(tenantId, [plotId]);
  return states.get(plotId) ?? null;
}

export async function getPlotDocumentStates(tenantId: string, plotIds: string[]) {
  const ids = [...new Set(plotIds.filter(Boolean))];
  if (!ids.length) return new Map<string, PlotDocumentState>();

  const [plots, ownershipRecords, registryRecords, generatedDocuments, files] = await Promise.all([
    prisma.plot.findMany({
      where: { tenantId, id: { in: ids }, archivedAt: null },
      select: { id: true, status: true, currentOwnerId: true, currentOwner: { select: { name: true } } },
    }),
    prisma.ownershipRecord.findMany({
      where: { tenantId, plotId: { in: ids }, cancelledAt: null, kind: { in: ["ALLOTMENT", "TRANSFER"] } },
      include: { owner: { select: { id: true, name: true } }, createdBy: { select: { name: true, email: true } } },
      orderBy: [{ effectiveAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.registryRecord.findMany({
      where: { tenantId, plotId: { in: ids }, archivedAt: null },
      orderBy: [{ registryDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.generatedDocument.findMany({
      where: { tenantId, recordType: "Plot", recordId: { in: ids }, archivedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.fileAsset.findMany({
      where: { tenantId, ownerType: "Plot", ownerId: { in: ids }, deletedAt: null },
      orderBy: [{ documentDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const uploaderIds = [...new Set(files.map((file) => file.uploadedById).filter((id): id is string => Boolean(id)))];
  const registeredOwnerIds = [...new Set(registryRecords.map((record) => record.registeredOwnerId).filter((id): id is string => Boolean(id)))];
  const [uploaders, registeredOwners] = await Promise.all([
    uploaderIds.length
      ? prisma.user.findMany({ where: { tenantId, id: { in: uploaderIds } }, select: { id: true, name: true, email: true } })
      : [],
    registeredOwnerIds.length
      ? prisma.owner.findMany({ where: { tenantId, id: { in: registeredOwnerIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const uploaderName = new Map(uploaders.map((user) => [user.id, user.name || user.email]));
  const ownerName = new Map(registeredOwners.map((owner) => [owner.id, owner.name]));
  const documentsById = new Map(generatedDocuments.map((document) => [document.id, document]));
  const filesById = new Map(files.map((file) => [file.id, file]));
  const states = new Map<string, PlotDocumentState>();

  for (const plot of plots) {
    const identity: PlotIdentity = {
      id: plot.id,
      status: plot.status,
      currentOwnerId: plot.currentOwnerId,
      currentOwnerName: plot.currentOwner?.name ?? null,
    };
    const plotOwnership = ownershipRecords.filter((record) => record.plotId === plot.id);
    const plotRegistries = registryRecords.filter((record) => record.plotId === plot.id);
    const plotDocuments = generatedDocuments.filter((document) => document.recordId === plot.id);
    const plotFiles = files.filter((file) => file.ownerId === plot.id);
    states.set(
      plot.id,
      resolvePlotDocumentState(
        identity,
        plotOwnership,
        plotRegistries,
        plotDocuments,
        plotFiles,
        documentsById,
        filesById,
        uploaderName,
        ownerName,
      ),
    );
  }
  return states;
}

function resolvePlotDocumentState(
  plot: PlotIdentity,
  ownershipRecords: Array<{
    id: string;
    kind: OwnershipKind;
    ownerId: string | null;
    owner: { id: string; name: string } | null;
    documentId: string | null;
    effectiveAt: Date;
    createdAt: Date;
    extraDetails: unknown;
    createdBy: { name: string; email: string } | null;
  }>,
  registryRecords: Array<{
    id: string;
    status: string;
    registryNo: string | null;
    registryDate: Date | null;
    registeredOwnerId: string | null;
    fileAssetId: string | null;
    createdAt: Date;
    createdById: string | null;
  }>,
  generatedDocuments: GeneratedDocument[],
  files: FileAsset[],
  documentsById: Map<string, GeneratedDocument>,
  filesById: Map<string, FileAsset>,
  uploaderName: Map<string, string>,
  registeredOwnerName: Map<string, string>,
): PlotDocumentState {
  const history: PlotDocumentHistoryItem[] = [];
  const usedDocumentIds = new Set<string>();
  const usedFileIds = new Set<string>();

  for (const record of ownershipRecords) {
    const kind = record.kind === "TRANSFER" ? "TRANSFER" : "ALLOTMENT";
    const document = record.documentId ? documentsById.get(record.documentId) ?? null : null;
    if (document) usedDocumentIds.add(document.id);
    const signedFile = resolveSignedFile(record.extraDetails, document, files, filesById, kind, record.effectiveAt, usedFileIds);
    const generatedFile = document?.fileAssetId ? filesById.get(document.fileAssetId) ?? null : null;
    const visibleFile = signedFile ?? generatedFile;
    if (signedFile) usedFileIds.add(signedFile.id);
    if (generatedFile) usedFileIds.add(generatedFile.id);
    history.push({
      id: `ownership:${record.id}`,
      plotId: plot.id,
      kind,
      label: kind === "TRANSFER" ? "Transfer Letter" : "Allotment Letter",
      number: document?.number ?? signedFile?.documentNo ?? generatedFile?.documentNo ?? null,
      documentDate: visibleFile?.documentDate ?? record.effectiveAt,
      ownerId: record.ownerId,
      ownerName: record.owner?.name ?? null,
      uploadedAt: visibleFile?.createdAt ?? null,
      uploadedBy: visibleFile?.uploadedById
        ? uploaderName.get(visibleFile.uploadedById) ?? record.createdBy?.name ?? record.createdBy?.email ?? null
        : record.createdBy?.name ?? record.createdBy?.email ?? null,
      fileAssetId: visibleFile?.id ?? null,
      generatedFileAssetId: generatedFile?.id ?? null,
      generatedDocumentId: document?.id ?? null,
      status: signedFile ? "SIGNED" : document?.status ?? "DOCUMENT MISSING",
      version: visibleFile?.version ?? 0,
      signed: Boolean(signedFile),
      missing: !visibleFile && !document,
      latest: false,
    });
  }

  const unclaimedRegistryFiles = files.filter((file) => isRegistryFile(file) && !usedFileIds.has(file.id));
  for (const registry of registryRecords) {
    const linked = registry.fileAssetId ? filesById.get(registry.fileAssetId) ?? null : null;
    const closest = linked ?? findClosestFile(
      unclaimedRegistryFiles.filter((file) => !usedFileIds.has(file.id)),
      registry.registryDate ?? registry.createdAt,
    );
    if (closest) usedFileIds.add(closest.id);
    const registeredOwnerId = registry.registeredOwnerId ?? plot.currentOwnerId;
    history.push({
      id: `registry:${registry.id}`,
      plotId: plot.id,
      kind: "REGISTRY",
      label: closest?.documentType === "REGISTRY_RECEIPT" ? "Registry Receipt" : "Registry Document",
      number: registry.registryNo ?? closest?.documentNo ?? null,
      documentDate: registry.registryDate ?? closest?.documentDate ?? registry.createdAt,
      ownerId: registeredOwnerId,
      ownerName: registeredOwnerId
        ? registeredOwnerName.get(registeredOwnerId) ?? (registeredOwnerId === plot.currentOwnerId ? plot.currentOwnerName : null)
        : plot.currentOwnerName,
      uploadedAt: closest?.createdAt ?? null,
      uploadedBy: closest?.uploadedById
        ? uploaderName.get(closest.uploadedById) ?? null
        : registry.createdById ? uploaderName.get(registry.createdById) ?? null : null,
      fileAssetId: closest?.id ?? null,
      generatedFileAssetId: null,
      generatedDocumentId: null,
      status: registry.status,
      version: closest?.version ?? 0,
      signed: Boolean(closest),
      missing: !closest,
      latest: false,
    });
  }

  for (const document of generatedDocuments) {
    if (usedDocumentIds.has(document.id) || !isOwnershipGeneratedDocument(document)) continue;
    const kind = document.type.toLowerCase().includes("transfer") ? "TRANSFER" : "ALLOTMENT";
    const signedFile = document.signedFileAssetId ? filesById.get(document.signedFileAssetId) ?? null : null;
    const generatedFile = document.fileAssetId ? filesById.get(document.fileAssetId) ?? null : null;
    const visibleFile = signedFile ?? generatedFile;
    if (visibleFile) usedFileIds.add(visibleFile.id);
    history.push({
      id: `document:${document.id}`,
      plotId: plot.id,
      kind,
      label: kind === "TRANSFER" ? "Transfer Letter" : "Allotment Letter",
      number: document.number,
      documentDate: visibleFile?.documentDate ?? document.signedAt ?? document.finalizedAt ?? document.createdAt,
      ownerId: null,
      ownerName: null,
      uploadedAt: visibleFile?.createdAt ?? null,
      uploadedBy: visibleFile?.uploadedById ? uploaderName.get(visibleFile.uploadedById) ?? null : null,
      fileAssetId: visibleFile?.id ?? null,
      generatedFileAssetId: generatedFile?.id ?? null,
      generatedDocumentId: document.id,
      status: signedFile ? "SIGNED" : document.status,
      version: visibleFile?.version ?? 0,
      signed: Boolean(signedFile),
      missing: !visibleFile,
      latest: false,
    });
  }

  for (const file of files) {
    if (usedFileIds.has(file.id) || !isLegalPlotFile(file)) continue;
    const kind = fileKind(file);
    const relatedOwnership = ownershipRecords
      .filter((record) => (kind === "TRANSFER" ? record.kind === "TRANSFER" : kind === "ALLOTMENT" ? record.kind === "ALLOTMENT" : false))
      .sort((left, right) => dateDistance(file.documentDate ?? file.createdAt, left.effectiveAt) - dateDistance(file.documentDate ?? file.createdAt, right.effectiveAt))[0];
    history.push({
      id: `file:${file.id}`,
      plotId: plot.id,
      kind,
      label: documentLabel(file),
      number: file.documentNo,
      documentDate: file.documentDate ?? file.createdAt,
      ownerId: relatedOwnership?.ownerId ?? plot.currentOwnerId,
      ownerName: relatedOwnership?.owner?.name ?? plot.currentOwnerName,
      uploadedAt: file.createdAt,
      uploadedBy: file.uploadedById ? uploaderName.get(file.uploadedById) ?? null : null,
      fileAssetId: file.id,
      generatedFileAssetId: null,
      generatedDocumentId: null,
      status: isSignedOwnershipFile(file) ? "SIGNED" : "UPLOADED",
      version: file.version,
      signed: isSignedOwnershipFile(file) || kind === "REGISTRY",
      missing: false,
      latest: false,
    });
  }

  history.sort((left, right) => {
    const date = right.documentDate.getTime() - left.documentDate.getTime();
    return date || documentRank(right, plot.status) - documentRank(left, plot.status);
  });
  const latestDocument = [...history]
    .filter((document) => {
      if (document.kind === "SUPPORTING" || document.missing) return false;
      if (document.kind === "REGISTRY" && plot.status !== "REGISTERED") return false;
      return Boolean(document.fileAssetId || document.generatedDocumentId);
    })
    .sort((left, right) => documentRank(right, plot.status) - documentRank(left, plot.status) || right.documentDate.getTime() - left.documentDate.getTime())[0] ?? null;
  if (latestDocument) latestDocument.latest = true;

  return {
    plotId: plot.id,
    plotStatus: plot.status,
    currentOwnerId: plot.currentOwnerId,
    currentOwnerName: plot.currentOwnerName,
    latestDocument,
    history,
    signedAllotmentAvailable: history.some((document) => document.kind === "ALLOTMENT" && document.signed),
    registryDocumentAvailable: history.some((document) => document.kind === "REGISTRY" && Boolean(document.fileAssetId)),
  };
}

function resolveSignedFile(
  extraDetails: unknown,
  document: GeneratedDocument | null,
  files: FileAsset[],
  filesById: Map<string, FileAsset>,
  kind: "ALLOTMENT" | "TRANSFER",
  effectiveAt: Date,
  usedFileIds: Set<string>,
) {
  const explicitIds = [document?.signedFileAssetId, ...collectFileIds(extraDetails)].filter((id): id is string => Boolean(id));
  for (const id of explicitIds) {
    const file = filesById.get(id);
    if (file && (isSignedOwnershipFile(file) || file.id === document?.signedFileAssetId)) return file;
  }
  return files
    .filter((file) => {
      if (usedFileIds.has(file.id)) return false;
      if (!isSignedOwnershipFile(file)) return false;
      if (kind === "TRANSFER" && fileKind(file) !== "TRANSFER") return false;
      if (kind === "ALLOTMENT" && fileKind(file) !== "ALLOTMENT") return false;
      return !document?.number || !file.documentNo || file.documentNo === document.number;
    })
    .sort((left, right) => {
      const distance = dateDistance(left.documentDate ?? left.createdAt, effectiveAt) - dateDistance(right.documentDate ?? right.createdAt, effectiveAt);
      return distance || right.version - left.version || right.createdAt.getTime() - left.createdAt.getTime();
    })[0] ?? null;
}

function isOwnershipGeneratedDocument(document: GeneratedDocument) {
  const type = document.type.toLowerCase();
  return type.includes("allotment") || type.includes("transfer");
}

function isSignedOwnershipFile(file: FileAsset) {
  const category = file.categoryKey?.toLowerCase() ?? "";
  const notes = file.notes?.toLowerCase() ?? "";
  const name = file.fileName.toLowerCase();
  return category === "signed-allotment-letter"
    || category === "signed-transfer-letter"
    || (category === "old-documents" && (ownershipTypes.has(file.documentType as RealEstateDocumentType) || /allot|transfer/.test(`${name} ${notes}`)));
}

function isRegistryFile(file: FileAsset) {
  return registryTypes.has(file.documentType as RealEstateDocumentType)
    || file.categoryKey === "registry-document"
    || /registry|registered deed/.test(`${file.fileName} ${file.notes ?? ""}`.toLowerCase());
}

function isLegalPlotFile(file: FileAsset) {
  return isSignedOwnershipFile(file) || isRegistryFile(file) || Boolean(file.documentType);
}

function fileKind(file: FileAsset): PlotDocumentKind {
  if (isRegistryFile(file)) return "REGISTRY";
  const searchable = `${file.categoryKey ?? ""} ${file.fileName} ${file.notes ?? ""}`.toLowerCase();
  if (file.documentType === "TRANSFER_LETTER" || /transfer/.test(searchable)) return "TRANSFER";
  if (file.documentType === "ALLOTMENT_LETTER" || /allot/.test(searchable)) return "ALLOTMENT";
  return "SUPPORTING";
}

function documentLabel(file: FileAsset) {
  const kind = fileKind(file);
  if (kind === "TRANSFER") return "Transfer Letter";
  if (kind === "ALLOTMENT") return "Allotment Letter";
  if (kind === "REGISTRY") return file.documentType === "REGISTRY_RECEIPT" ? "Registry Receipt" : "Registry Document";
  if (file.documentType && file.documentType !== "OTHER") return file.documentType.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return "Supporting Document";
}

function documentRank(document: PlotDocumentHistoryItem, plotStatus: PlotStatus) {
  if (document.kind === "REGISTRY") return plotStatus === "REGISTERED" ? 500 : 350;
  if (document.kind === "TRANSFER") return document.signed ? 400 : 220;
  if (document.kind === "ALLOTMENT") return document.signed ? 250 : 200;
  return 100;
}

function findClosestFile(files: FileAsset[], date: Date) {
  return [...files].sort((left, right) => dateDistance(left.documentDate ?? left.createdAt, date) - dateDistance(right.documentDate ?? right.createdAt, date))[0] ?? null;
}

function dateDistance(left: Date, right: Date) {
  return Math.abs(left.getTime() - right.getTime());
}

function collectFileIds(value: unknown): string[] {
  const ids = new Set<string>();
  visit(value, ids);
  return [...ids];
}

function visit(value: unknown, ids: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => visit(entry, ids));
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && (typeof record.fileName === "string" || typeof record.mimeType === "string")) ids.add(record.id);
  Object.values(record).forEach((entry) => visit(entry, ids));
}
