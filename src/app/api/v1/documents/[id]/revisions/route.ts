import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok } from "@/server/api";
import { createDocumentRevision, listDocumentRevisions } from "@/server/services/document-revisions";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.view");
    return ok(await listDocumentRevisions(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    return created(await createDocumentRevision(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
