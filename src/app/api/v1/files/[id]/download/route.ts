import { NextRequest, NextResponse } from "next/server";
import { apiError, getRequestContext } from "@/server/api";
import { getFileForDownload } from "@/server/services/files";
import { createDownloadUrl, getLocalObject, isLocalStorageKey } from "@/server/storage";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.view");
    const file = await getFileForDownload(context, params.id);

    if (isLocalStorageKey(file.storageKey)) {
      const bytes = await getLocalObject(file.storageKey);
      return new NextResponse(bytes, {
        headers: {
          "content-type": file.mimeType,
          "content-disposition": `attachment; filename="${file.fileName}"`,
        },
      });
    }

    const url = await createDownloadUrl({ key: file.storageKey, fileName: file.fileName });
    return NextResponse.redirect(url);
  } catch (error) {
    return apiError(error);
  }
}
