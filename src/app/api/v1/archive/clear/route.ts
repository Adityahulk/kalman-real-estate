import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { clearArchiveSchema, clearArchiveView } from "@/server/services/archive";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "records.restore");
    return ok(await clearArchiveView(context, await parseJson(request, clearArchiveSchema)));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/archive/clear" });
  }
}
