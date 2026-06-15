import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import {
  createLetterFieldCategory,
  createLetterFieldDefinition,
  letterFieldCategorySchema,
  letterFieldDefinitionSchema,
  listLetterFieldSettings,
} from "@/server/services/letter-field-settings";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    return ok(await listLetterFieldSettings(context.tenantId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    const kind = new URL(request.url).searchParams.get("kind");
    return kind === "category"
      ? created(await createLetterFieldCategory(context, await parseJson(request, letterFieldCategorySchema)))
      : created(await createLetterFieldDefinition(context, await parseJson(request, letterFieldDefinitionSchema)));
  } catch (error) {
    return apiError(error);
  }
}
