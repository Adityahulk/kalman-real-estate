import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { deleteDocument } from "@/server/services/documents";

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "records.restore");
    return ok(await deleteDocument(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
