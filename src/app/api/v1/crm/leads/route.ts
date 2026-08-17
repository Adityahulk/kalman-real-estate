import { NextRequest } from "next/server";
import { CrmLeadPotential, CrmLeadStatus } from "@prisma/client";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { createCrmLead, createCrmLeadSchema, listCrmLeads } from "@/server/services/crm";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "crm.view");
    const params = request.nextUrl.searchParams;
    const status = enumValue(CrmLeadStatus, params.get("status"));
    const potential = enumValue(CrmLeadPotential, params.get("potential"));
    return ok(await listCrmLeads(context, {
      q: params.get("q") || undefined,
      status,
      potential,
      sourceId: params.get("sourceId") || undefined,
      projectId: params.get("projectId") || undefined,
      assignedToId: params.get("assignedToId") || undefined,
    }));
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/crm/leads" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "crm.manage");
    const input = await parseJson(request, createCrmLeadSchema);
    return created(await createCrmLead(context, input));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/crm/leads" });
  }
}

function enumValue<T extends Record<string, string>>(values: T, value: string | null): T[keyof T] | undefined {
  return value && Object.values(values).includes(value) ? value as T[keyof T] : undefined;
}
