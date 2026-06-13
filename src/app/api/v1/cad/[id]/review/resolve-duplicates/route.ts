import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { resolveCadDuplicateCandidates } from "@/server/services/cad";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await resolveCadDuplicateCandidates(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
