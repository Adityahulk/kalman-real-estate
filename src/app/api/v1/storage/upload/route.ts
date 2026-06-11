import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { putLocalObject } from "@/server/storage";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const key = request.nextUrl.searchParams.get("key")?.trim() ?? "";
    const tenantPrefix = `local/${context.tenantId}/`;
    if (!key.startsWith(tenantPrefix)) {
      const error = new Error("Upload key does not belong to this tenant");
      error.name = "ForbiddenError";
      throw error;
    }

    const maxBytes = Number(process.env.MAX_LOCAL_UPLOAD_MB ?? process.env.MAX_CAD_UPLOAD_MB ?? 100) * 1024 * 1024;
    const declaredBytes = Number(request.headers.get("content-length") ?? 0);
    if (declaredBytes > maxBytes) throwBadRequest("The uploaded file is larger than the configured local upload limit.");

    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length) throwBadRequest("The uploaded file is empty.");
    if (bytes.length > maxBytes) throwBadRequest("The uploaded file is larger than the configured local upload limit.");

    await putLocalObject(key, bytes);
    return ok({ storageKey: key, sizeBytes: bytes.length });
  } catch (error) {
    return apiError(error);
  }
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}
