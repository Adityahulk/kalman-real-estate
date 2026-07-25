import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { approveCostInsight } from "@/server/services/ai";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ai.generate");
    return ok(await approveCostInsight(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
