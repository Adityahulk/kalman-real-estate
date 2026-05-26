import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { registrySchema, updateRegistry } from "@/server/services/ownership";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await updateRegistry(context, params.id, await parseJson(request, registrySchema)));
  } catch (error) {
    return apiError(error);
  }
}
