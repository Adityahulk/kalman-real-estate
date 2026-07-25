import { NextRequest } from "next/server";
import { apiError, ok, parseJson } from "@/server/api";
import { getSessionUser } from "@/server/session";
import { updateFirm, updateFirmSchema } from "@/server/services/firms";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser();
    if (!session) {
      const error = new Error("Unauthenticated");
      error.name = "UnauthorizedError";
      throw error;
    }
    return ok(await updateFirm(session, params.id, await parseJson(request, updateFirmSchema)));
  } catch (error) {
    return apiError(error);
  }
}
