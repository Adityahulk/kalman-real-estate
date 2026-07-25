import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { updatePublishedEntity, updatePublishedEntitySchema } from "@/server/services/cad";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; entityId: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.review");
    const input = await parseJson(request, updatePublishedEntitySchema);
    return ok(await updatePublishedEntity(context, params.id, params.entityId, input));
  } catch (error) {
    return apiError(error);
  }
}
