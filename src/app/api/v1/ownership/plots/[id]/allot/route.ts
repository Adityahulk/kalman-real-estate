import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { allotPlot, allotPlotSchema, updateLatestAllotment } from "@/server/services/ownership";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request);
    return ok(await allotPlot(context, params.id, await parseJson(request, allotPlotSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request);
    return ok(await updateLatestAllotment(context, params.id, await parseJson(request, allotPlotSchema)));
  } catch (error) {
    return apiError(error);
  }
}
