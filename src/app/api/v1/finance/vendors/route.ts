import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createVendor, vendorSchema } from "@/server/services/finance";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "finance.manage");
    return created(await createVendor(context, await parseJson(request, vendorSchema)));
  } catch (error) {
    return apiError(error);
  }
}
