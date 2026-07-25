import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { cadUploadCompleteSchema, completeCadUpload } from "@/server/services/cad";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.upload");
    const input = await parseJson(request, cadUploadCompleteSchema);
    return ok(await completeCadUpload(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
