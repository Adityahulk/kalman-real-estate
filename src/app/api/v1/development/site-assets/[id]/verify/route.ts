import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { verifyDevelopmentTask, verifyDevelopmentTaskSchema } from "@/server/services/development";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "engineering.verify");
    return ok(await verifyDevelopmentTask(context, params.id, await parseJson(request, verifyDevelopmentTaskSchema)));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/development/site-assets/[id]/verify", siteAssetId: params.id });
  }
}
