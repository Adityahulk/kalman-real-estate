import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { resetPasswordSchema, resetUserPassword } from "@/server/services/users";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await resetUserPassword(context, params.id, await parseJson(request, resetPasswordSchema)));
  } catch (error) {
    return apiError(error);
  }
}
