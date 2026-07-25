import { NextRequest, NextResponse } from "next/server";
import { FileStorageProvider } from "@prisma/client";
import { apiError } from "@/server/api";
import { prisma } from "@/server/db";
import { verifyFileShareToken } from "@/server/file-share";
import { createDownloadUrl, getLocalObject, isLocalStorageKey } from "@/server/storage";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const valid = verifyFileShareToken(
      params.id,
      request.nextUrl.searchParams.get("expires"),
      request.nextUrl.searchParams.get("signature"),
    );
    if (!valid) {
      const error = new Error("This shared file link is invalid or expired.");
      error.name = "UnauthorizedError";
      throw error;
    }

    const file = await prisma.fileAsset.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!file) {
      const error = new Error("File was not found or has been deleted.");
      error.name = "NotFoundError";
      throw error;
    }

    const disposition = request.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    if (file.storageProvider === FileStorageProvider.LOCAL || isLocalStorageKey(file.storageKey)) {
      const bytes = await getLocalObject(file.storageKey);
      return new NextResponse(bytes, {
        headers: {
          "content-type": file.mimeType,
          "content-disposition": `${disposition}; filename="${file.fileName}"`,
        },
      });
    }

    try {
      const url = await createDownloadUrl({ key: file.storageKey, fileName: file.fileName, disposition });
      return NextResponse.redirect(url);
    } catch (error) {
      if (file.fallbackStorageKey) {
        const bytes = await getLocalObject(file.fallbackStorageKey);
        return new NextResponse(bytes, {
          headers: {
            "content-type": file.mimeType,
            "content-disposition": `${disposition}; filename="${file.fileName}"`,
            "x-storage-fallback": "local",
          },
        });
      }
      throw error;
    }
  } catch (error) {
    return apiError(error, { route: "public.files.download", fileId: params.id });
  }
}
