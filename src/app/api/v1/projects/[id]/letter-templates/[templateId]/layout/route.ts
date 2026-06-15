import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { updatePdfTemplateLayout, updatePdfTemplateLayoutSchema } from "@/server/services/document-templates";

export async function PATCH(request: NextRequest, { params }: { params: { id: string; templateId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await updatePdfTemplateLayout(context, params.id, params.templateId, await parseJson(request, updatePdfTemplateLayoutSchema)));
  } catch (error) {
    return apiError(error);
  }
}
