import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { activateTemplate } from "@/server/services/document-templates";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; templateId: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await activateTemplate(context, params.id, params.templateId));
  } catch (error) {
    return apiError(error);
  }
}
