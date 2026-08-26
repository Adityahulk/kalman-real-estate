import { NextRequest } from "next/server";
import { apiError, assertProjectAccess, getRequestContext, ok, parseJson } from "@/server/api";
import { updateProject, updateProjectSchema } from "@/server/services/projects";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "projects.manage");
    assertProjectAccess(context, params.id);
    const input = await parseJson(request, updateProjectSchema);
    return ok(await updateProject(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
