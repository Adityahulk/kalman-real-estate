import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { createUser, createUserSchema, listUsers } from "@/server/services/users";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await listUsers(context));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return created(await createUser(context, await parseJson(request, createUserSchema)));
  } catch (error) {
    return apiError(error);
  }
}
