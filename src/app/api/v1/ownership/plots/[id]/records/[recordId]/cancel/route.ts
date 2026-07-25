import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { cancelLatestOwnershipRecord } from "@/server/services/ownership";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; recordId: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await cancelLatestOwnershipRecord(context, params.id, params.recordId));
  } catch (error) {
    return apiError(error, {
      route: "ownership.cancel-latest-record",
      plotId: params.id,
      recordId: params.recordId,
    });
  }
}
