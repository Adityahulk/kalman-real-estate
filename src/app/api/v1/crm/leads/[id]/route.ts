import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { getCrmLead, updateCrmLead, updateCrmLeadSchema } from "@/server/services/crm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request, "crm.view");
    return ok(await getCrmLead(context, (await params).id));
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/crm/leads/[id]" });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request, "crm.manage");
    const input = await parseJson(request, updateCrmLeadSchema);
    return ok(await updateCrmLead(context, (await params).id, input));
  } catch (error) {
    return apiError(error, { route: "PATCH /api/v1/crm/leads/[id]" });
  }
}
