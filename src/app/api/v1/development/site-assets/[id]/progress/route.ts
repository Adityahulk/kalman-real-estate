import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { progressSchema, updateSiteAssetProgress } from "@/server/services/development";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request);
    return ok(await updateSiteAssetProgress(context, params.id, await parseJson(request, progressSchema)));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/development/site-assets/[id]/progress", siteAssetId: params.id });
  }
}
