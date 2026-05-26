import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { generateDocument, generateDocumentSchema } from "@/server/services/documents";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return created(await generateDocument(context, await parseJson(request, generateDocumentSchema)));
  } catch (error) {
    return apiError(error);
  }
}
