import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { progressSchema, updateSiteAssetProgress } from "@/server/services/development";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "development.manage");
    return ok(await updateSiteAssetProgress(context, params.id, await parseJson(request, progressSchema)));
  } catch (error) {
    return apiError(error);
  }
}
