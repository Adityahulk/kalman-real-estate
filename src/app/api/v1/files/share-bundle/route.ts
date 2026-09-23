import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { prisma } from "@/server/db";
import { createShortFileShareId, splitFileShareIds } from "@/server/file-share";
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

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const groups = splitFileShareIds(uniqueIds);
    const bundles = groups.map((fileIds) => ({
      id: createShortFileShareId(),
      tenantId: context.tenantId,
      createdById: context.userId,
      fileIds,
      expiresAt,
    }));

    await prisma.$transaction([
      prisma.fileShareBundle.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      ...bundles.map((bundle) => prisma.fileShareBundle.create({ data: bundle })),
    ]);

    const origin = publicAppOrigin(request);
    const links = bundles.map((bundle) => ({
      url: new URL(`/s/${encodeURIComponent(bundle.id)}`, origin).toString(),
      count: bundle.fileIds.length,
    }));
    return ok({ url: links[0].url, count: uniqueIds.length, links });
  } catch (error) {
    return apiError(error, { route: "files.share-bundle" });
  }
}
