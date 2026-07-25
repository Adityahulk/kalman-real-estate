import { NextRequest } from "next/server";

const PRODUCTION_APP_ORIGIN = "https://widestateos.com";

/**
 * Public links must never use an internal Docker/localhost host. Prefer the configured public
 * origin, then reverse-proxy headers, with the known production domain as a production fallback.
 */
export function publicAppOrigin(request: NextRequest) {
  const configured = process.env.PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured && (!isLocalOrigin(configured) || process.env.NODE_ENV !== "production")) return configured;

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto")) ?? request.nextUrl.protocol.replace(":", "");
  if (forwardedHost && (!isLocalHost(forwardedHost) || process.env.NODE_ENV !== "production")) return `${forwardedProto}://${forwardedHost}`;

  if (process.env.NODE_ENV === "production") return PRODUCTION_APP_ORIGIN;
  return request.nextUrl.origin;
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function isLocalOrigin(value: string) {
  try {
    return isLocalHost(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isLocalHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}
