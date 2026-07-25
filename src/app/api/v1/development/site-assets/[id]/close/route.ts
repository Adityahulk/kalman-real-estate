import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { closeDevelopmentTask } from "@/server/services/development";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "development.manage");
    return ok(await closeDevelopmentTask(context, params.id));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/development/site-assets/[id]/close", siteAssetId: params.id });
  }
}
