import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteCadFile, deleteCadSchema } from "@/server/services/cad";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.delete");
    const input = await parseJson(request, deleteCadSchema);
    return ok(await deleteCadFile(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
