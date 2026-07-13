import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { encodeFileBundleToken } from "@/server/file-share";
import { getFileForDownload } from "@/server/services/files";

const shareBundleSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "documents.view");
    const { fileIds } = await parseJson(request, shareBundleSchema);

    // Dedupe and confirm every file is one this caller may access before minting a public link —
    // getFileForDownload enforces tenant scoping and access rules, and throws otherwise.
    const uniqueIds = [...new Set(fileIds)];
    await Promise.all(uniqueIds.map((id) => getFileForDownload(context, id)));

    const token = encodeFileBundleToken(uniqueIds);
    const url = new URL("/share", publicOrigin(request));
    url.searchParams.set("d", token);
    return ok({ url: url.toString(), count: uniqueIds.length });
  } catch (error) {
    return apiError(error, { route: "files.share-bundle" });
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
