import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getPlatformOverview } from "@/server/services/platform";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    return ok(await getPlatformOverview(context));
  } catch (error) {
    return apiError(error);
  }
}
