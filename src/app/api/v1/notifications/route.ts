import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { listNotifications } from "@/server/services/notifications";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    return ok(await listNotifications(context));
  } catch (error) {
    return apiError(error);
  }
}
