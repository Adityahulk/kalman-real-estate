import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { deleteDocument } from "@/server/services/documents";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.approve");
    return ok(await deleteDocument(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
