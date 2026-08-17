import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { actOnCrmLead, crmLeadActionSchema } from "@/server/services/crm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request, "crm.manage");
    const input = await parseJson(request, crmLeadActionSchema);
    return ok(await actOnCrmLead(context, (await params).id, input));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/crm/leads/[id]/actions" });
  }
}
