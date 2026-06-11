import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createProjectFileField, projectFileFieldSchema } from "@/server/services/project-file-fields";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    return created(await createProjectFileField(context, await parseJson(request, projectFileFieldSchema)));
  } catch (error) {
    return apiError(error);
  }
}
