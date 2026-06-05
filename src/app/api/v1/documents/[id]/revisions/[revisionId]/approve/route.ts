import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { approveDocumentRevision, approveRevisionSchema } from "@/server/services/document-revisions";

export async function POST(request: NextRequest, { params }: { params: { id: string; revisionId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.approve");
    const input = await parseJson(request, approveRevisionSchema);
    return ok(await approveDocumentRevision(context, params.id, params.revisionId, input));
  } catch (error) {
    return apiError(error);
  }
}
