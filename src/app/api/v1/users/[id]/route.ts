import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { deleteUser, updateUser, updateUserSchema } from "@/server/services/users";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await updateUser(context, params.id, await parseJson(request, updateUserSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await deleteUser(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
