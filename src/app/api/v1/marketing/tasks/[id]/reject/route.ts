import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { marketingApprovalSchema, rejectMarketingTask } from "@/server/services/marketing";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "marketing.manage");
    const input = await parseJson(request, marketingApprovalSchema.partial().extend({ notes: marketingApprovalSchema.shape.notes }));
    return ok(await rejectMarketingTask(context, params.id, { status: "REJECTED", notes: input.notes }));
  } catch (error) {
    return apiError(error);
  }
}
