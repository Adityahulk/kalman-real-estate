import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { generateWeeklyReport, insightSchema } from "@/server/services/ai";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "ai.generate");
    return ok(await generateWeeklyReport(context, await parseJson(request, insightSchema)));
  } catch (error) {
    return apiError(error);
  }
}
