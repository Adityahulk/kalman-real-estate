import { FileAsset, FileVisibility } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { prisma } from "../db";
import { createUploadUrl, storageKey } from "../storage";

export const fileUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  visibility: z.nativeEnum(FileVisibility).default(FileVisibility.ADMIN_ONLY),
  ownerType: z.string().optional(),
  ownerId: z.string().optional(),
});

export async function createFileUpload(context: RequestContext, input: z.infer<typeof fileUploadSchema>) {
  const key = storageKey([context.tenantId, "files", `${Date.now()}-${input.fileName}`]);
  const file = await prisma.fileAsset.create({
    data: {
      tenantId: context.tenantId,
      storageKey: key,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      uploadedById: context.userId,
    },
  });

  const upload = await createUploadUrl({ key, contentType: input.mimeType });
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
    ownerType?: string;
    ownerId?: string;
  },
) {
  return prisma.fileAsset.create({
    data: {
      tenantId: context.tenantId,
      storageKey: input.storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility ?? FileVisibility.ADMIN_ONLY,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      uploadedById: context.userId,
    },
  });
}

export async function getFileForDownload(context: RequestContext, id: string): Promise<FileAsset> {
  const file = await prisma.fileAsset.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });

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
    if (document && document.status !== "APPROVED" && document.status !== "ISSUED") return false;

    const plot = await prisma.plot.findFirst({
      where: { id: file.ownerId, tenantId: file.tenantId, currentOwnerId: ownerId, ownerVisible: true },
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
      where: { id: progress.parentId, tenantId: file.tenantId, currentOwnerId: ownerId, ownerVisible: true },
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
