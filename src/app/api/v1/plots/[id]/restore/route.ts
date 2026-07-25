import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { restoreManualPlot } from "@/server/services/manual-hierarchy";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "records.restore");
    return ok(await restoreManualPlot(context, params.id));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/plots/[id]/restore", plotId: params.id });
  }
}
