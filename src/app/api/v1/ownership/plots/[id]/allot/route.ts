import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { allotPlot, allotPlotSchema } from "@/server/services/ownership";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await allotPlot(context, params.id, await parseJson(request, allotPlotSchema)));
  } catch (error) {
    return apiError(error);
  }
}
