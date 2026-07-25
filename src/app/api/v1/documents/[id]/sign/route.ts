import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { signDocument, signDocumentSchema } from "@/server/services/documents";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.sign");
    return ok(await signDocument(context, params.id, await parseJson(request, signDocumentSchema)));
  } catch (error) {
    return apiError(error);
  }
}
