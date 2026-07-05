import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { createFileShareToken } from "@/server/file-share";
import { getFileForDownload } from "@/server/services/files";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.view");
    const file = await getFileForDownload(context, params.id);
    const token = createFileShareToken(file.id);
    const url = new URL(`/api/v1/public/files/${file.id}/download`, publicOrigin(request));
    url.searchParams.set("expires", String(token.expires));
    url.searchParams.set("signature", token.signature);
    return ok({ url: url.toString(), expires: token.expires, fileName: file.fileName });
  } catch (error) {
    return apiError(error, { route: "files.share", fileId: params.id });
  }
}

function publicOrigin(request: NextRequest) {
  const configured = process.env.PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured) return configured;

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto")) ?? request.nextUrl.protocol.replace(":", "");
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = firstForwardedValue(request.headers.get("host"));
  if (host) return `${request.nextUrl.protocol}//${host}`;

  return request.nextUrl.origin;
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}
