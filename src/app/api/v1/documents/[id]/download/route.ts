import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getDocumentDownload } from "@/server/services/documents";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.view");
    return ok(await getDocumentDownload(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
