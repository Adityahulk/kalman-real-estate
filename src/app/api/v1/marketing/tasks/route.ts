import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createMarketingTask, marketingTaskSchema } from "@/server/services/marketing";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "marketing.manage");
    return created(await createMarketingTask(context, await parseJson(request, marketingTaskSchema)));
  } catch (error) {
    return apiError(error);
  }
}
