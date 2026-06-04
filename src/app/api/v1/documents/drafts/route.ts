import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createDocumentDraft, createDocumentDraftSchema } from "@/server/services/documents";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return created(await createDocumentDraft(context, await parseJson(request, createDocumentDraftSchema)));
  } catch (error) {
    return apiError(error);
  }
}
