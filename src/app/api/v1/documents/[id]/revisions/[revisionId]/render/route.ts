import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { renderDocumentRevision } from "@/server/services/document-revisions";

export async function POST(request: NextRequest, { params }: { params: { id: string; revisionId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await renderDocumentRevision(context, params.id, params.revisionId));
  } catch (error) {
    return apiError(error);
  }
}
