import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { markNotificationRead } from "@/server/services/notifications";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request);
    return ok(await markNotificationRead(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
