import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { retryCadProcessing } from "@/server/services/cad";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.upload");
    return ok(await retryCadProcessing(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
