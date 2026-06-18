import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteMarketingTask, updateMarketingTask, updateMarketingTaskSchema } from "@/server/services/marketing";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "marketing.manage");
    return ok(await updateMarketingTask(context, params.id, await parseJson(request, updateMarketingTaskSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "marketing.manage");
    return ok(await deleteMarketingTask(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
