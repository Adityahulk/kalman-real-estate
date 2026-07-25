import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { addProgressPhotos, progressPhotoSchema } from "@/server/services/development";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "development.manage");
    return ok(await addProgressPhotos(context, params.id, await parseJson(request, progressPhotoSchema)));
  } catch (error) {
    return apiError(error);
  }
}
