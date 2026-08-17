import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { createCrmSetting, crmSettingSchema, listCrmSettings } from "@/server/services/crm";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "crm.assign");
    return ok(await listCrmSettings(context));
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/crm/settings" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "crm.assign");
    const input = await parseJson(request, crmSettingSchema);
    return created(await createCrmSetting(context, input));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/crm/settings" });
  }
}
