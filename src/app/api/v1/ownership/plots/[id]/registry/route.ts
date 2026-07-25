import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { registrySchema, updateRegistry } from "@/server/services/ownership";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await updateRegistry(context, params.id, await parseJson(request, registrySchema)));
  } catch (error) {
    return apiError(error);
  }
}
