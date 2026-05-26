import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { cadUploadSchema, createCadUpload } from "@/server/services/cad";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "cad.upload");
    return created(await createCadUpload(context, await parseJson(request, cadUploadSchema)));
  } catch (error) {
    return apiError(error);
  }
}
