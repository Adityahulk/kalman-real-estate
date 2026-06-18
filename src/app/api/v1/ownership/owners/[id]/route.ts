import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { ownerSchema, updateOwner } from "@/server/services/ownership";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await updateOwner(context, params.id, await parseJson(request, ownerSchema)));
  } catch (error) {
    return apiError(error);
  }
}
