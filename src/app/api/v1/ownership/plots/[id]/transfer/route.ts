import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { transferPlot, transferPlotSchema } from "@/server/services/ownership";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await transferPlot(context, params.id, await parseJson(request, transferPlotSchema)));
  } catch (error) {
    return apiError(error);
  }
}
