import { NextRequest } from "next/server";
import { approveMarketingTask, marketingApprovalSchema } from "@/server/services/marketing";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "marketing.manage");
    return ok(await approveMarketingTask(context, params.id, await parseJson(request, marketingApprovalSchema)));
  } catch (error) {
    return apiError(error);
  }
}
