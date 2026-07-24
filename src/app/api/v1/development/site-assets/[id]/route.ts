import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteDevelopmentTask, developmentTaskSchema, updateDevelopmentTask } from "@/server/services/development";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "development.manage");
    return ok(await updateDevelopmentTask(context, params.id, await parseJson(request, developmentTaskSchema)));
  } catch (error) {
    return apiError(error, { route: "PATCH /api/v1/development/site-assets/[id]", siteAssetId: params.id });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "development.manage");
    return ok(await deleteDevelopmentTask(context, params.id));
  } catch (error) {
    return apiError(error, { route: "DELETE /api/v1/development/site-assets/[id]", siteAssetId: params.id });
  }
}
