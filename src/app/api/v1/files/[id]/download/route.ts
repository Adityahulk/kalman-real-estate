import { NextRequest, NextResponse } from "next/server";
import { FileStorageProvider } from "@prisma/client";
import { apiError, getRequestContext } from "@/server/api";
import { getFileForDownload } from "@/server/services/files";
import { createDownloadUrl, getLocalObject, isLocalStorageKey } from "@/server/storage";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.view");
    const file = await getFileForDownload(context, params.id);
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
    return apiError(error);
  }
}
