import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createManualPlot, manualPlotSchema } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    const input = await parseJson(request, manualPlotSchema);
    return created(await createManualPlot(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
