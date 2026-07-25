import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { resolveCadDuplicateCandidates } from "@/server/services/cad";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await resolveCadDuplicateCandidates(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
