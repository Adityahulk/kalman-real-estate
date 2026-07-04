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
