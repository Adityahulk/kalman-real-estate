import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { createApproval, createApprovalSchema, listApprovals } from "@/server/services/approvals";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "liaison.view");
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "1";
    return ok(await listApprovals(context, { includeArchived }));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "liaison.manage");
    return created(await createApproval(context, await parseJson(request, createApprovalSchema)));
  } catch (error) {
    return apiError(error);
  }
}
