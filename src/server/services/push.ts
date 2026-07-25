import { createSign } from "node:crypto";
import { prisma } from "../db";
import { logServerError } from "../logger";

// Push delivery for the Capacitor mobile shell. This is a best-effort transport that mirrors
// in-app notifications — a failed OS delivery can never break the primary DB notification write.
// FCM's legacy server-key endpoint is retired, so this uses the supported HTTP v1 API with a
// Firebase service-account JSON value in FCM_SERVICE_ACCOUNT_JSON. When it is unset, in-app
// notifications continue to work and native push is simply disabled.

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function pushEnabled() {
  return Boolean(serviceAccount());
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
        const result = await sendToToken(token, message);
        if (result === "sent") sent += 1;
        if (result === "stale") stale.push(token);
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

async function sendToToken(token: string, message: PushMessage): Promise<"sent" | "stale" | "failed"> {
  try {
    const account = serviceAccount();
    if (!account?.project_id) return "failed";
    const accessToken = await getAccessToken(account);
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: stringifyData(message.data),
          android: { priority: "HIGH", notification: { sound: "default" } },
          apns: { payload: { aps: { sound: "default" } } },
        },
      }),
    });
    if (response.ok) return "sent";
    const result = await response.json().catch(() => null) as { error?: { status?: string } } | null;
    // Only remove a token when FCM explicitly says that particular registration is no longer valid.
    return result?.error?.status === "UNREGISTERED" ? "stale" : "failed";
  } catch (error) {
    logServerError(error, { at: "push.sendToToken" });
    return "failed";
  }
}

function serviceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FirebaseServiceAccount;
    return parsed.client_email && parsed.private_key && (parsed.project_id || process.env.FCM_PROJECT_ID) ? {
      ...parsed,
      project_id: parsed.project_id || process.env.FCM_PROJECT_ID,
    } : null;
  } catch {
    return null;
  }
}

async function getAccessToken(account: FirebaseServiceAccount): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }, account.private_key!);
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const result = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !result?.access_token) throw new Error("Could not obtain an FCM access token.");
  cachedAccessToken = { value: result.access_token, expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000 };
  return cachedAccessToken.value;
}

function signJwt(payload: Record<string, unknown>, privateKey: string) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  signer.end();
  return `${header}.${body}.${signer.sign(privateKey).toString("base64url")}`;
}

function stringifyData(data: Record<string, unknown> | undefined) {
  return Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]));
}
