import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getCadCandidates } from "@/server/services/cad";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.view");
    return ok(await getCadCandidates(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
