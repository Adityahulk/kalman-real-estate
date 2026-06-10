import { NextRequest } from "next/server";
import { apiError, created, parseJson } from "@/server/api";
import { getSessionUser } from "@/server/session";
import { createFirmField, firmFieldSchema } from "@/server/services/firms";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      const error = new Error("Unauthenticated");
      error.name = "UnauthorizedError";
      throw error;
    }
    return created(await createFirmField(session, await parseJson(request, firmFieldSchema)));
  } catch (error) {
    return apiError(error);
  }
}
