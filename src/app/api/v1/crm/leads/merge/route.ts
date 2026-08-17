import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { mergeCrmLeads, mergeCrmLeadsSchema } from "@/server/services/crm";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "crm.assign");
    const input = await parseJson(request, mergeCrmLeadsSchema);
    return ok(await mergeCrmLeads(context, input));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/crm/leads/merge" });
  }
}
