import { NextRequest } from "next/server";
import { apiError, ok, parseJson } from "@/server/api";
import { getSessionUser } from "@/server/session";
import { ownershipSettingsSchema, updateOwnershipSettings } from "@/server/services/firms";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      const error = new Error("Unauthenticated");
      error.name = "UnauthorizedError";
      throw error;
    }
    return ok(await updateOwnershipSettings(session, await parseJson(request, ownershipSettingsSchema)));
  } catch (error) {
    return apiError(error);
  }
}
