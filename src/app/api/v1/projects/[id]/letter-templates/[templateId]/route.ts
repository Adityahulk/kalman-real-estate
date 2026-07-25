import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { deleteProjectLetterTemplate } from "@/server/services/document-templates";

export async function DELETE(request: NextRequest, props: { params: Promise<{ templateId: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await deleteProjectLetterTemplate(context, params.templateId));
  } catch (error) {
    return apiError(error);
  }
}
