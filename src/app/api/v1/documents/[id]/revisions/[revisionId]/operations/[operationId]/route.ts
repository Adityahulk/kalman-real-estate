import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { deleteRevisionOperation } from "@/server/services/document-revisions";

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; revisionId: string; operationId: string }> }
) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "documents.generate");
    return ok(await deleteRevisionOperation(context, params.id, params.revisionId, params.operationId));
  } catch (error) {
    return apiError(error);
  }
}
