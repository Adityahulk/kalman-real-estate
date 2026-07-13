import { createHmac, timingSafeEqual } from "node:crypto";

const shareSecret = process.env.JWT_SECRET ?? "development-secret-change-me";
const defaultShareTtlSeconds = 60 * 60 * 24 * 30;

export function createFileShareToken(fileId: string, expiresAtSeconds = Math.floor(Date.now() / 1000) + defaultShareTtlSeconds) {
  return {
    expires: expiresAtSeconds,
    signature: signFileShare(fileId, expiresAtSeconds),
  };
}

export function verifyFileShareToken(fileId: string, expires: string | null, signature: string | null) {
  const expiresAtSeconds = Number(expires);
  if (!Number.isFinite(expiresAtSeconds) || !signature) return false;
  if (expiresAtSeconds < Math.floor(Date.now() / 1000)) return false;

  const expected = signFileShare(fileId, expiresAtSeconds);
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function signFileShare(fileId: string, expiresAtSeconds: number) {
  return createHmac("sha256", shareSecret)
    .update(`${fileId}.${expiresAtSeconds}`)
    .digest("hex");
}

// --- Bundle sharing -------------------------------------------------------
// A bundle lets several files be shared with ONE short link instead of pasting
// one long signed URL per file (which overflows WhatsApp's text= limit and
// breaks auto-linking). The link is stateless: the file ids + expiry + HMAC are
// encoded into the URL, so no database row is needed.

// Sorting makes the signature order-independent, so re-selecting the same files
// in a different order still verifies.
function bundlePayload(fileIds: string[], expiresAtSeconds: number) {
  return `${[...fileIds].sort().join(",")}.${expiresAtSeconds}`;
}

function signFileBundle(fileIds: string[], expiresAtSeconds: number) {
  return createHmac("sha256", shareSecret).update(bundlePayload(fileIds, expiresAtSeconds)).digest("hex");
}

export function encodeFileBundleToken(fileIds: string[], expiresAtSeconds = Math.floor(Date.now() / 1000) + defaultShareTtlSeconds) {
  const data = { ids: fileIds, expires: expiresAtSeconds, sig: signFileBundle(fileIds, expiresAtSeconds) };
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

export function decodeFileBundleToken(token: string): { ids: string[]; expires: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      ids?: unknown;
      expires?: unknown;
      sig?: unknown;
    };
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is string => typeof id === "string") : [];
    const expires = Number(parsed.expires);
    const sig = typeof parsed.sig === "string" ? parsed.sig : "";
    if (!ids.length || !Number.isFinite(expires) || !sig) return null;
    if (expires < Math.floor(Date.now() / 1000)) return null;

    const expected = signFileBundle(ids, expires);
    const providedBuffer = Buffer.from(sig, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (providedBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;
    return { ids, expires };
  } catch {
    return null;
  }
}
