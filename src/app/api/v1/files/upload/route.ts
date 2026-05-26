import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createFileUpload, fileUploadSchema } from "@/server/services/files";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return created(await createFileUpload(context, await parseJson(request, fileUploadSchema)));
  } catch (error) {
    return apiError(error);
  }
}
