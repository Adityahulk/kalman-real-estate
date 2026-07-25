import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { markNotificationRead } from "@/server/services/notifications";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request);
    return ok(await markNotificationRead(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
