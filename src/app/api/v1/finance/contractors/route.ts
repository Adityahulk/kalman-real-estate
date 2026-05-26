import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { contractorSchema, createContractor } from "@/server/services/finance";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "finance.manage");
    return created(await createContractor(context, await parseJson(request, contractorSchema)));
  } catch (error) {
    return apiError(error);
  }
}
