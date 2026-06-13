import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import {
  cadOverlaySchema,
  listCadOverlays,
  saveCadOverlay,
} from "@/server/services/cad-overlays";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await listCadOverlays(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.review");
    return created(await saveCadOverlay(context, params.id, await parseJson(request, cadOverlaySchema)));
  } catch (error) {
    return apiError(error);
  }
}
