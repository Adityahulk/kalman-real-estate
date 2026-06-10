import { NextRequest } from "next/server";
import { apiError, created, parseJson } from "@/server/api";
import { getSessionUser } from "@/server/session";
import { createFirm, createFirmSchema } from "@/server/services/firms";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      const error = new Error("Unauthenticated");
      error.name = "UnauthorizedError";
      throw error;
    }
    return created(await createFirm(session, await parseJson(request, createFirmSchema)));
  } catch (error) {
    return apiError(error);
  }
}
