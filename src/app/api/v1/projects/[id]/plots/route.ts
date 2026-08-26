import { NextRequest } from "next/server";
import { apiError, assertProjectAccess, created, getRequestContext, parseJson } from "@/server/api";
import { createManualPlot, manualPlotSchema } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    assertProjectAccess(context, params.id);
    const input = await parseJson(request, manualPlotSchema);
    return created(await createManualPlot(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
