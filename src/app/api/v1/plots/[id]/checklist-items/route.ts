import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createManualPlotZone, manualPlotZoneSchema } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "development.manage");
    const input = await parseJson(request, manualPlotZoneSchema);
    return created(await createManualPlotZone(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
