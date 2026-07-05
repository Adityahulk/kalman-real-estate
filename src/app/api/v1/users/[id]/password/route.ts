import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { resetPasswordSchema, resetUserPassword } from "@/server/services/users";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await resetUserPassword(context, params.id, await parseJson(request, resetPasswordSchema)));
  } catch (error) {
    return apiError(error);
  }
}
