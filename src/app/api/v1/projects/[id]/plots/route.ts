import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createManualPlot, manualPlotSchema } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    const input = await parseJson(request, manualPlotSchema);
    return created(await createManualPlot(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
