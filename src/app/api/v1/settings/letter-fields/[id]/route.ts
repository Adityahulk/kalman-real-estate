import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import {
  deleteLetterFieldCategory,
  deleteLetterFieldDefinition,
  updateLetterFieldCategory,
  updateLetterFieldDefinition,
  updateLetterFieldSchema,
} from "@/server/services/letter-field-settings";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    const kind = new URL(request.url).searchParams.get("kind");
    const input = await parseJson(request, updateLetterFieldSchema);
    return ok(kind === "category" ? await updateLetterFieldCategory(context, params.id, input) : await updateLetterFieldDefinition(context, params.id, input));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    const kind = new URL(request.url).searchParams.get("kind");
    return ok(kind === "category" ? await deleteLetterFieldCategory(context, params.id) : await deleteLetterFieldDefinition(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
