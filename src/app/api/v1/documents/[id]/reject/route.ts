import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { approveDocument, approveDocumentSchema } from "@/server/services/documents";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.approve");
    const input = await parseJson(request, approveDocumentSchema.partial().extend({ notes: approveDocumentSchema.shape.notes }));
    return ok(await approveDocument(context, params.id, { status: "REJECTED", notes: input.notes }));
  } catch (error) {
    return apiError(error);
  }
}
