import { NextRequest } from "next/server";
import { addMarketingComment, commentSchema } from "@/server/services/marketing";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "marketing.execute");
    return created(await addMarketingComment(context, params.id, await parseJson(request, commentSchema)));
  } catch (error) {
    return apiError(error);
  }
}
