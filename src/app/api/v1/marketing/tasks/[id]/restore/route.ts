import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { restoreMarketingTask } from "@/server/services/marketing";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "records.restore");
    return ok(await restoreMarketingTask(context, params.id));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/marketing/tasks/[id]/restore", taskId: params.id });
  }
}
