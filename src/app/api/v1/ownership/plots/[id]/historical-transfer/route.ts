import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { historicalTransferSchema, recordHistoricalTransfer } from "@/server/services/ownership";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await recordHistoricalTransfer(context, params.id, await parseJson(request, historicalTransferSchema)));
  } catch (error) {
    return apiError(error, { route: "ownership.historical-transfer", plotId: params.id });
  }
}
