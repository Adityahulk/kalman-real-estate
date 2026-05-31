import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getPlotWorkspace } from "@/server/services/plot-workspace";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.view");
    return ok(await getPlotWorkspace(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
