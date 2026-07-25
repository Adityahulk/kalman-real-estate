import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { historicalAllotmentSchema, recordHistoricalAllotment } from "@/server/services/ownership";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await recordHistoricalAllotment(context, params.id, await parseJson(request, historicalAllotmentSchema)));
  } catch (error) {
    return apiError(error, { route: "ownership.historical-allotment", plotId: params.id });
  }
}
