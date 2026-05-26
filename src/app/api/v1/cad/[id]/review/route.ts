import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { cadReviewSchema, reviewCad } from "@/server/services/cad";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.review");
    return ok(await reviewCad(context, params.id, await parseJson(request, cadReviewSchema)));
  } catch (error) {
    return apiError(error);
  }
}
