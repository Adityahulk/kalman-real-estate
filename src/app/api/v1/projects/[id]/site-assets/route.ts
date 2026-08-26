import { NextRequest } from "next/server";
import { apiError, assertProjectAccess, created, getRequestContext, parseJson } from "@/server/api";
import { createManualSiteAsset, manualSiteAssetSchema } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "development.manage");
    assertProjectAccess(context, params.id);
    const input = await parseJson(request, manualSiteAssetSchema);
    return created(await createManualSiteAsset(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
