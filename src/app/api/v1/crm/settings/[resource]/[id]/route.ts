import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { archiveCrmSetting, updateCrmSetting, updateCrmSettingSchema } from "@/server/services/crm";

type Params = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request, "crm.assign");
    const { resource, id } = await params;
    return ok(await updateCrmSetting(context, resource, id, await parseJson(request, updateCrmSettingSchema)));
  } catch (error) {
    return apiError(error, { route: "PATCH /api/v1/crm/settings/[resource]/[id]" });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request, "crm.assign");
    const { resource, id } = await params;
    return ok(await archiveCrmSetting(context, resource, id));
  } catch (error) {
    return apiError(error, { route: "DELETE /api/v1/crm/settings/[resource]/[id]" });
  }
}
