import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { renderDocumentDraft } from "@/server/services/documents";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(_request, "documents.generate");
    return ok(await renderDocumentDraft(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
