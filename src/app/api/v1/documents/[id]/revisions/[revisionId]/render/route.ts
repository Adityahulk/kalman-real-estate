import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { renderDocumentRevision } from "@/server/services/document-revisions";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; revisionId: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await renderDocumentRevision(context, params.id, params.revisionId));
  } catch (error) {
    return apiError(error);
  }
}
