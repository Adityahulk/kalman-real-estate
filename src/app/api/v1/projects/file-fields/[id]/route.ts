import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteProjectFileField, updateProjectFileField, updateProjectFileFieldSchema } from "@/server/services/project-file-fields";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "projects.manage");
    return ok(await updateProjectFileField(context, params.id, await parseJson(request, updateProjectFileFieldSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "projects.manage");
    return ok(await deleteProjectFileField(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
