import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { saveProjectLetterTemplate, saveProjectLetterTemplateSchema } from "@/server/services/document-templates";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return created(await saveProjectLetterTemplate(context, params.id, await parseJson(request, saveProjectLetterTemplateSchema)));
  } catch (error) {
    return apiError(error);
  }
}
