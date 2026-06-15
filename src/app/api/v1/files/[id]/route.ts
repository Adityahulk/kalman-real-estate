import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteFileAsset, deleteFileSchema, renameFileAsset, renameFileSchema } from "@/server/services/files";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "files.upload");
    return ok(await renameFileAsset(context, params.id, await parseJson(request, renameFileSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "files.upload");
    const input = await parseJson(request, deleteFileSchema);
    return ok(await deleteFileAsset(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
