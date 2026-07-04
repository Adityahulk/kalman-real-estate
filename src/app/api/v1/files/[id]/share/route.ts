import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { createFileShareToken } from "@/server/file-share";
import { getFileForDownload } from "@/server/services/files";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.view");
    const file = await getFileForDownload(context, params.id);
    const token = createFileShareToken(file.id);
    const url = new URL(`/api/v1/public/files/${file.id}/download`, request.nextUrl.origin);
    url.searchParams.set("expires", String(token.expires));
    url.searchParams.set("signature", token.signature);
    return ok({ url: url.toString(), expires: token.expires, fileName: file.fileName });
  } catch (error) {
    return apiError(error, { route: "files.share", fileId: params.id });
  }
}
