import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { addRevisionOperation, addRevisionOperationSchema } from "@/server/services/document-revisions";

export async function POST(request: NextRequest, { params }: { params: { id: string; revisionId: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    const input = await parseJson(request, addRevisionOperationSchema);
    return ok(await addRevisionOperation(context, params.id, params.revisionId, input));
  } catch (error) {
    return apiError(error);
  }
}
