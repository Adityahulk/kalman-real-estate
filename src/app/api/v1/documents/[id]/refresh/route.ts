import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { refreshDocumentDraft, refreshDocumentDraftSchema } from "@/server/services/documents";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.generate");
    const input = await parseJson(request, refreshDocumentDraftSchema);
    return ok(await refreshDocumentDraft(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
