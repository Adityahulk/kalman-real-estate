import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { updateDocumentDraft, updateDocumentDraftSchema } from "@/server/services/documents";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.generate");
    const input = await parseJson(request, updateDocumentDraftSchema);
    return ok(await updateDocumentDraft(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
