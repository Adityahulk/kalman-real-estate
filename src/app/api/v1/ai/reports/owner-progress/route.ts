import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { generateOwnerProgressSummary, ownerProgressSchema } from "@/server/services/ai";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "owner.portal");
    return ok(await generateOwnerProgressSummary(context, await parseJson(request, ownerProgressSchema)));
  } catch (error) {
    return apiError(error);
  }
}
