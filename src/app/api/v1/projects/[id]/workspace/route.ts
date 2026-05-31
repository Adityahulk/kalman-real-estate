import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getProjectWorkspace } from "@/server/services/projects";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    return ok(await getProjectWorkspace(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
