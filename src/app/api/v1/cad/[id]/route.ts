import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteCadFile, deleteCadSchema, renameCadFile, renameCadSchema } from "@/server/services/cad";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.upload");
    return ok(await renameCadFile(context, params.id, await parseJson(request, renameCadSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.delete");
    const input = await parseJson(request, deleteCadSchema);
    return ok(await deleteCadFile(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
