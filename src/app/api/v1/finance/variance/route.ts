import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getVarianceReport } from "@/server/services/finance";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "finance.view");
    return ok(await getVarianceReport(context, request.nextUrl.searchParams.get("projectId") ?? undefined));
  } catch (error) {
    return apiError(error);
  }
}
