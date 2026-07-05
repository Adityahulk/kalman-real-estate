import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getApprovalHistory } from "@/server/services/approvals";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "liaison.view");
    return ok(await getApprovalHistory(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
