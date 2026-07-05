import { AuditAction, FileAsset, FileStorageProvider, FileVisibility, Prisma, RealEstateDocumentType } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { createUploadTargets, storageKey } from "../storage";

export const fileUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  visibility: z.nativeEnum(FileVisibility).default(FileVisibility.ADMIN_ONLY),
  documentType: z.nativeEnum(RealEstateDocumentType).optional(),
  documentNo: z.string().optional(),
  documentDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  ownerType: z.string().optional(),
  ownerId: z.string().optional(),
  categoryKey: z.string().max(100).optional(),
});

export const deleteFileSchema = z.object({
  reason: z.string().optional(),
});

export const renameFileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
});

export const uploadCompleteSchema = z.object({
  storageProvider: z.nativeEnum(FileStorageProvider),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export async function createFileUpload(context: RequestContext, input: z.infer<typeof fileUploadSchema>) {
  await assertOwnerRecord(context, input.ownerType, input.ownerId);
  const key = storageKey([context.tenantId, "files", `${Date.now()}-${input.fileName}`]);
  const upload = await createUploadTargets({ key, contentType: input.mimeType });
  const file = await prisma.fileAsset.create({
    data: {
      tenantId: context.tenantId,
      storageKey: upload.primary.storageKey,
      storageProvider: upload.primary.provider,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility,
      documentType: input.documentType,
      documentNo: input.documentNo,
      documentDate: input.documentDate ? new Date(input.documentDate) : undefined,
      notes: input.notes,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      categoryKey: input.categoryKey,
      uploadedById: context.userId,
    },
  });

  await writeAuditEvent(context, {
    action: AuditAction.UPLOAD,
    entityType: "FileAsset",
    entityId: file.id,
    after: file as unknown as Prisma.InputJsonValue,
  });
  return { file, upload };
}

export async function createGeneratedFileAsset(
  context: Pick<RequestContext, "tenantId" | "userId">,
  input: {
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    visibility?: FileVisibility;
    documentType?: RealEstateDocumentType;
    documentNo?: string;
    documentDate?: Date;
    notes?: string;
    ownerType?: string;
    ownerId?: string;
    storageProvider?: FileStorageProvider;
    fallbackStorageKey?: string;
  },
) {
  return prisma.fileAsset.create({
    data: {
      tenantId: context.tenantId,
      storageKey: input.storageKey,
      storageProvider: input.storageProvider ?? (input.storageKey.startsWith("local/") ? FileStorageProvider.LOCAL : FileStorageProvider.S3),
      fallbackStorageKey: input.fallbackStorageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility ?? FileVisibility.ADMIN_ONLY,
      documentType: input.documentType,
      documentNo: input.documentNo,
      documentDate: input.documentDate,
      notes: input.notes,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      uploadedById: context.userId,
    },
  });
}

export async function completeFileUpload(context: RequestContext, id: string, input: z.infer<typeof uploadCompleteSchema>) {
  const before = await prisma.fileAsset.findFirstOrThrow({
    where: { id, tenantId: context.tenantId, deletedAt: null },
  });
  assertUploadKeyAllowed(context, before, input.storageKey);

  const file = await prisma.fileAsset.update({
    where: { id },
    data: {
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      sizeBytes: input.sizeBytes ?? before.sizeBytes,
    },
  });

  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "FileAsset",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: file as unknown as Prisma.InputJsonValue,
  });

  return file;
}

function assertUploadKeyAllowed(context: RequestContext, file: FileAsset, storageKey: string) {
  const allowed = new Set([
    file.storageKey,
    file.fallbackStorageKey,
    `local/${file.storageKey}`,
  ].filter(Boolean) as string[]);
  const tenantPrefix = `${context.tenantId}/`;
  const localTenantPrefix = `local/${context.tenantId}/`;
  if (allowed.has(storageKey) || storageKey.startsWith(tenantPrefix) || storageKey.startsWith(localTenantPrefix)) return;
  const error = new Error("Upload key does not belong to this tenant");
  error.name = "ForbiddenError";
  throw error;
}

async function assertOwnerRecord(context: RequestContext, ownerType?: string, ownerId?: string) {
  if (!ownerType || !ownerId) return;
  if (ownerType === "Plot") {
    await prisma.plot.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId, archivedAt: null } });
    return;
  }
  if (ownerType === "Owner") {
    await prisma.owner.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
  if (ownerType === "Project") {
    await prisma.project.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
  if (ownerType === "RegistryRecord") {
    await prisma.registryRecord.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
  if (ownerType === "ProgressUpdate") {
    await prisma.progressUpdate.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
  if (ownerType === "MarketingTask") {
    await prisma.marketingTask.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
  if (ownerType === "GeneratedDocumentRevision") {
    await prisma.generatedDocumentRevision.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
  if (ownerType === "GeneratedDocument") {
    await prisma.generatedDocument.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } });
    return;
  }
}

export async function getFileForDownload(context: RequestContext, id: string): Promise<FileAsset> {
  const file = await prisma.fileAsset.findFirst({
    where: { id, tenantId: context.tenantId, deletedAt: null },
  });
  if (!file) throwNotFound("File was not found or has been deleted");

  if (context.role === "PLOT_OWNER") {
    if (file.visibility !== "OWNER_VISIBLE" && file.visibility !== "SHARED") {
      throwForbidden("File is not visible to this owner");
    }

    const owner = await ownerForUser(context);
    const canAccess = owner ? await ownerCanAccessFile(owner.id, file) : false;
    if (!canAccess) {
      throwForbidden("File does not belong to this owner or is not approved for owner download");
    }
  }

  return file;
}

export async function deleteFileAsset(context: RequestContext, id: string, input: z.infer<typeof deleteFileSchema>) {
  const before = await prisma.fileAsset.findFirstOrThrow({
    where: { id, tenantId: context.tenantId, deletedAt: null },
  });

  const file = await prisma.fileAsset.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: context.userId,
      deleteReason: input.reason,
    },
  });
  await prisma.generatedDocument.updateMany({
    where: { tenantId: context.tenantId, fileAssetId: id },
    data: { fileAssetId: null },
  });

  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "FileAsset",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: {
      deletedAt: file.deletedAt?.toISOString(),
      deletedById: context.userId,
      deleteReason: input.reason,
      fileName: before.fileName,
      documentType: before.documentType,
      documentNo: before.documentNo,
      documentDate: before.documentDate?.toISOString(),
      ownerType: before.ownerType,
      ownerId: before.ownerId,
      visibility: before.visibility,
    },
  });

  return file;
}

export async function renameFileAsset(context: RequestContext, id: string, input: z.infer<typeof renameFileSchema>) {
  const before = await prisma.fileAsset.findFirstOrThrow({
    where: { id, tenantId: context.tenantId, deletedAt: null },
  });
  const file = await prisma.fileAsset.update({ where: { id }, data: { fileName: input.fileName } });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "FileAsset",
    entityId: id,
    before: { fileName: before.fileName },
    after: { fileName: file.fileName },
  });
  return file;
}

async function ownerForUser(context: RequestContext) {
  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  if (!user) return null;
  return prisma.owner.findFirst({
    where: {
      tenantId: context.tenantId,
      OR: [
        user.email ? { email: user.email } : undefined,
        user.phone ? { phone: user.phone } : undefined,
      ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
    },
  });
}

async function ownerCanAccessFile(ownerId: string, file: FileAsset) {
  if (!file.ownerType || !file.ownerId) return file.visibility === "SHARED";

  if (file.ownerType === "Plot") {
    const document = await prisma.generatedDocument.findFirst({
      where: { tenantId: file.tenantId, fileAssetId: file.id },
      select: { status: true },
    });
    // A letter is owner-visible once it has been approved. Approval now advances the letter into the
    // signature stages (SENT_FOR_SIGNATURE → SIGNED), so those count as owner-visible too.
    const ownerVisibleStatuses = ["APPROVED", "ISSUED", "SENT_FOR_SIGNATURE", "SIGNED"];
    if (document && !ownerVisibleStatuses.includes(document.status)) return false;

    const plot = await prisma.plot.findFirst({
      where: { id: file.ownerId, tenantId: file.tenantId, currentOwnerId: ownerId, ownerVisible: true, archivedAt: null },
      select: { id: true },
    });
    return Boolean(plot);
  }

  if (file.ownerType === "ProgressUpdate") {
    const progress = await prisma.progressUpdate.findFirst({
      where: { id: file.ownerId, tenantId: file.tenantId, visibleToOwner: true },
      select: { parentType: true, parentId: true },
    });
    if (!progress || progress.parentType !== "Plot") return false;

    const plot = await prisma.plot.findFirst({
      where: { id: progress.parentId, tenantId: file.tenantId, currentOwnerId: ownerId, ownerVisible: true, archivedAt: null },
      select: { id: true },
    });
    return Boolean(plot);
  }

  return file.visibility === "SHARED";
}

function throwForbidden(message: string): never {
  const error = new Error(message);
  error.name = "ForbiddenError";
  throw error;
}

function throwNotFound(message: string): never {
  const error = new Error(message);
  error.name = "NotFoundError";
  throw error;
}
