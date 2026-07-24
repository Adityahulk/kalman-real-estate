import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { verifyDevelopmentTask, verifyDevelopmentTaskSchema } from "@/server/services/development";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "engineering.verify");
    return ok(await verifyDevelopmentTask(context, params.id, await parseJson(request, verifyDevelopmentTaskSchema)));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/development/site-assets/[id]/verify", siteAssetId: params.id });
  }
}
