import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { cadPublishSchema, publishCad } from "@/server/services/cad";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.publish");
    return ok(await publishCad(context, params.id, await parseJson(request, cadPublishSchema)));
  } catch (error) {
    return apiError(error);
  }
}
