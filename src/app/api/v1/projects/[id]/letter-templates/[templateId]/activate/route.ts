import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { activateTemplate } from "@/server/services/document-templates";

export async function POST(request: NextRequest, { params }: { params: { id: string; templateId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await activateTemplate(context, params.id, params.templateId));
  } catch (error) {
    return apiError(error);
  }
}
