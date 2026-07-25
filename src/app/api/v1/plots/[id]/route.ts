import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { archiveManualPlot, manualPlotSchema, updateManualPlot } from "@/server/services/manual-hierarchy";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "records.restore");
    return ok(await updateManualPlot(context, params.id, await parseJson(request, manualPlotSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await archiveManualPlot(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
