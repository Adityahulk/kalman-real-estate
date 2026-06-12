import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { completeBrowserExtraction } from "@/server/services/cad-browser-extraction";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; runId: string } },
) {
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await completeBrowserExtraction(context, params.id, params.runId));
  } catch (error) {
    return apiError(error);
  }
}
