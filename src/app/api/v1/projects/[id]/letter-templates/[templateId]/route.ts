import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { deleteProjectLetterTemplate } from "@/server/services/document-templates";

export async function DELETE(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await deleteProjectLetterTemplate(context, params.templateId));
  } catch (error) {
    return apiError(error);
  }
}
