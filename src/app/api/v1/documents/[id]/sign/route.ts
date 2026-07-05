import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { signDocument, signDocumentSchema } from "@/server/services/documents";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.sign");
    return ok(await signDocument(context, params.id, await parseJson(request, signDocumentSchema)));
  } catch (error) {
    return apiError(error);
  }
}
