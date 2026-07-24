import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import {
  createUserSetting,
  createUserSettingSchema,
  deleteUserSetting,
  deleteUserSettingSchema,
  listUserRoleSettings,
  updateUserSetting,
  updateUserSettingSchema,
} from "@/server/services/user-role-settings";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await listUserRoleSettings(context));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return created(await createUserSetting(context, await parseJson(request, createUserSettingSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await updateUserSetting(context, await parseJson(request, updateUserSettingSchema)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "users.manage");
    return ok(await deleteUserSetting(context, await parseJson(request, deleteUserSettingSchema)));
  } catch (error) {
    return apiError(error);
  }
}
