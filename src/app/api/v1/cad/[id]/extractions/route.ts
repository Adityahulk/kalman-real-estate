import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import {
  createBrowserExtraction,
  createBrowserExtractionSchema,
  listBrowserExtractions,
} from "@/server/services/cad-browser-extraction";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await listBrowserExtractions(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.review");
    const input = await parseJson(request, createBrowserExtractionSchema);
    return created(await createBrowserExtraction(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}
