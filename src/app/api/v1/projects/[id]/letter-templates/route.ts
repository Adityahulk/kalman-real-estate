import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { prisma } from "@/server/db";
import { saveProjectLetterTemplate, saveProjectLetterTemplateSchema } from "@/server/services/document-templates";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    const templates = await prisma.documentTemplate.findMany({
      where: { tenantId: context.tenantId, projectId: params.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, type: true, body: true, variables: true, active: true, createdAt: true },
    });
    return ok(templates);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return created(await saveProjectLetterTemplate(context, params.id, await parseJson(request, saveProjectLetterTemplateSchema)));
  } catch (error) {
    return apiError(error);
  }
}
