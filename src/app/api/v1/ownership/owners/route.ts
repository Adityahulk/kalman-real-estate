import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { createOwner, ownerSchema } from "@/server/services/ownership";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return created(await createOwner(context, await parseJson(request, ownerSchema)));
  } catch (error) {
    return apiError(error);
  }
}
