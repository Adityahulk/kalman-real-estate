import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getPlotAudit } from "@/server/services/ownership";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.view");
    return ok(await getPlotAudit(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
