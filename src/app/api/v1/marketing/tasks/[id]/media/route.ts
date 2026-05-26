import { NextRequest } from "next/server";
import { addMarketingMedia, mediaSchema } from "@/server/services/marketing";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "marketing.execute");
    return created(await addMarketingMedia(context, params.id, await parseJson(request, mediaSchema)));
  } catch (error) {
    return apiError(error);
  }
}
