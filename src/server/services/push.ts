import { prisma } from "../db";
import { logServerError } from "../logger";

// Push delivery for the Capacitor mobile shell. This is a best-effort transport that mirrors
// in-app notifications — every caller wraps it so a push failure can never break the primary
// (DB) notification write. Configure with FCM_SERVER_KEY; when unset, push is a no-op so local
// and web-only deployments behave exactly as before.

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function pushEnabled() {
  return Boolean(process.env.FCM_SERVER_KEY);
}

// Register (or refresh) a device token for a user. Tokens are unique; the OS may hand the same
// physical device a new token over time, and a token may migrate between users on shared devices,
// so we upsert on the token and (re)bind it to the current user/tenant.
export async function registerDevice(input: {
  tenantId: string;
  userId: string;
  platform: string;
  token: string;
}) {
  return prisma.deviceToken.upsert({
    where: { token: input.token },
    create: input,
    update: { tenantId: input.tenantId, userId: input.userId, platform: input.platform },
  });
}

export async function unregisterDevice(token: string) {
  await prisma.deviceToken.deleteMany({ where: { token } });
}

// Send a push to every registered device of the given users. Never throws — logs and returns a
// count. Dead tokens reported by FCM are pruned so the table self-heals.
export async function sendPushToUsers(
  tenantId: string,
  userIds: Array<string | null | undefined>,
  message: PushMessage,
): Promise<{ sent: number }> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (!ids.length || !pushEnabled()) return { sent: 0 };

  try {
    const devices = await prisma.deviceToken.findMany({
      where: { tenantId, userId: { in: ids } },
      select: { token: true },
    });
    if (!devices.length) return { sent: 0 };

    const stale: string[] = [];
    let sent = 0;
    await Promise.all(
      devices.map(async ({ token }) => {
        const ok = await sendToToken(token, message);
        if (ok) sent += 1;
        else stale.push(token);
      }),
    );
    if (stale.length) {
      await prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
    }
    return { sent };
  } catch (error) {
    logServerError(error, { at: "push.sendPushToUsers", tenantId, userCount: ids.length });
    return { sent: 0 };
  }
}

async function sendToToken(token: string, message: PushMessage): Promise<boolean> {
  try {
    const response = await fetch(FCM_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `key=${process.env.FCM_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: { title: message.title, body: message.body },
        data: message.data ?? {},
        priority: "high",
      }),
    });
    if (!response.ok) return false;
    const result = (await response.json().catch(() => null)) as { failure?: number } | null;
    // A single-token send returns failure:1 for an unregistered/invalid token → prune it.
    return !result?.failure;
  } catch (error) {
    logServerError(error, { at: "push.sendToToken" });
    return false;
  }
}
