import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getProjectWorkspace } from "@/server/services/projects";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "projects.manage");
    return ok(await getProjectWorkspace(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
