import { ok } from "@/server/api";

export async function GET() {
  return ok({
    service: "kalman-estate-os",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
