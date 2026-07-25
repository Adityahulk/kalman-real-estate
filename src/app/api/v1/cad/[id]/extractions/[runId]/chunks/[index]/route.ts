import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import {
  browserExtractionChunkSchema,
  uploadBrowserExtractionChunk,
} from "@/server/services/cad-browser-extraction";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; runId: string; index: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.review");
    const input = await parseJson(request, browserExtractionChunkSchema);
    return ok(await uploadBrowserExtractionChunk(
      context,
      params.id,
      params.runId,
      Number(params.index),
      input,
    ));
  } catch (error) {
    return apiError(error);
  }
}
