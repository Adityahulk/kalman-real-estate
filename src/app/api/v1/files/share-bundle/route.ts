import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { encodeFileBundleToken } from "@/server/file-share";
import { getFileForDownload } from "@/server/services/files";
import { publicAppOrigin } from "@/server/public-app-url";

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
    const url = new URL("/share", publicAppOrigin(request));
    url.searchParams.set("d", token);
    return ok({ url: url.toString(), count: uniqueIds.length });
  } catch (error) {
    return apiError(error, { route: "files.share-bundle" });
  }
}
