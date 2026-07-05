import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createDevelopmentTask, createDevelopmentTaskSchema } from "@/server/services/development";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "engineering.assign");
    return created(await createDevelopmentTask(context, await parseJson(request, createDevelopmentTaskSchema)));
  } catch (error) {
    return apiError(error);
  }
}
