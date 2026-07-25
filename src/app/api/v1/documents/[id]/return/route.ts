import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { approveDocument, approveDocumentSchema } from "@/server/services/documents";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.approve");
    const input = await parseJson(request, approveDocumentSchema.partial().extend({ notes: approveDocumentSchema.shape.notes }));
    return ok(await approveDocument(context, params.id, { status: "CHANGES_REQUESTED", notes: input.notes }));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/documents/[id]/return", documentId: params.id });
  }
}
