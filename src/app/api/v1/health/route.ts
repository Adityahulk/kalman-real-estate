import { apiError, ok } from "@/server/api";

export async function GET() {
  try {
    return ok({
      service: "kalman-estate-os",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}
