import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createManualPlotZone, manualPlotZoneSchema } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "development.manage");
    const input = await parseJson(request, manualPlotZoneSchema);
    return created(await createManualPlotZone(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
