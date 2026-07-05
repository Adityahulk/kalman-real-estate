import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { updateUser, updateUserSchema } from "@/server/services/users";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await updateUser(context, params.id, await parseJson(request, updateUserSchema)));
  } catch (error) {
    return apiError(error);
  }
}
