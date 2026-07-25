import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { cancelBrowserExtraction } from "@/server/services/cad-browser-extraction";

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; runId: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await cancelBrowserExtraction(context, params.id, params.runId));
  } catch (error) {
    return apiError(error);
  }
}
