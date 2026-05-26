import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { generateCostInsights, insightSchema } from "@/server/services/ai";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "ai.generate");
    return ok(await generateCostInsights(context, await parseJson(request, insightSchema)));
  } catch (error) {
    return apiError(error);
  }
}
