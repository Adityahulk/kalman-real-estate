import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { ownerSchema, updateOwner } from "@/server/services/ownership";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await updateOwner(context, params.id, await parseJson(request, ownerSchema)));
  } catch (error) {
    return apiError(error);
  }
}
