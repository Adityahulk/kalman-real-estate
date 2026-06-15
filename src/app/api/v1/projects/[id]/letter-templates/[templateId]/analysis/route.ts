import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getPdfTemplateAnalysis } from "@/server/services/document-templates";

export async function GET(request: NextRequest, { params }: { params: { id: string; templateId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await getPdfTemplateAnalysis(context, params.id, params.templateId));
  } catch (error) {
    return apiError(error);
  }
}
