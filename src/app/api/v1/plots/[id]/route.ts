import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { archiveManualPlot, manualPlotSchema, updateManualPlot } from "@/server/services/manual-hierarchy";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await updateManualPlot(context, params.id, await parseJson(request, manualPlotSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await archiveManualPlot(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
