import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { submitDocument, submitDocumentSchema } from "@/server/services/documents";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.submit");
    return ok(await submitDocument(context, params.id, await parseJson(request, submitDocumentSchema)));
  } catch (error) {
    return apiError(error);
  }
}
