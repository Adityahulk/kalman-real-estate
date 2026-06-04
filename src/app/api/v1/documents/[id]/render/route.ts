import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { renderDocumentDraft } from "@/server/services/documents";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(_request, "documents.generate");
    return ok(await renderDocumentDraft(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
