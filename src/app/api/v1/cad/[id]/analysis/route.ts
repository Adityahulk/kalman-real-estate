import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getCadAnalysis } from "@/server/services/cad";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.view");
    return ok(await getCadAnalysis(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
