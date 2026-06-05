import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { completeFileUpload, uploadCompleteSchema } from "@/server/services/files";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "files.upload");
    const input = await parseJson(request, uploadCompleteSchema);
    return ok(await completeFileUpload(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
