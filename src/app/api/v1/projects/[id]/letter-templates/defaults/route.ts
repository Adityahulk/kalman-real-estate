import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { defaultLetterBody } from "@/server/services/document-templates";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await getRequestContext(request, "documents.generate");
    const type = new URL(request.url).searchParams.get("type") ?? "allotment_letter";
    return ok({ body: defaultLetterBody(type) });
  } catch (error) {
    return apiError(error);
  }
}
