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
      uploadedById: context.userId === "seed-admin" ? undefined : context.userId,
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
      uploadedById: context.userId === "seed-admin" ? undefined : context.userId,
    },
  });
}

export async function getFileForDownload(context: RequestContext, id: string): Promise<FileAsset> {
  const file = await prisma.fileAsset.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });

  if (context.role === "PLOT_OWNER" && file.visibility !== "OWNER_VISIBLE" && file.visibility !== "SHARED") {
    throw new Error("File is not visible to this owner");
  }

  return file;
}
