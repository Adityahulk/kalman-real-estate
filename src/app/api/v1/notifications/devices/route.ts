import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { registerDevice, unregisterDevice } from "@/server/services/push";

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]).default("android"),
});

const unregisterSchema = z.object({ token: z.string().min(1) });

// Register the current device for push. Any authenticated user may register their own device.
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const input = await parseJson(request, registerSchema);
    const device = await registerDevice({
      tenantId: context.tenantId,
      userId: context.userId,
      platform: input.platform,
      token: input.token,
    });
    return created({ id: device.id });
  } catch (error) {
    return apiError(error);
  }
}

// Unregister a device (logout / disable notifications).
export async function DELETE(request: NextRequest) {
  try {
    await getRequestContext(request);
    const input = await parseJson(request, unregisterSchema);
    await unregisterDevice(input.token);
    return ok({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
