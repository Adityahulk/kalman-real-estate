import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { cleanPlotAuditEvents } from "@/server/audit";
import { getPlotAudit } from "@/server/services/ownership";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.view");
    return ok(await getPlotAudit(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await cleanPlotAuditEvents(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
