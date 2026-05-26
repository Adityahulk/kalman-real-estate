import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { boqSchema, createBoqItem } from "@/server/services/finance";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "finance.manage");
    return created(await createBoqItem(context, await parseJson(request, boqSchema)));
  } catch (error) {
    return apiError(error);
  }
}
