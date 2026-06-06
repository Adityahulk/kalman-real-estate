import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { cadRollbackSchema, rollbackCadPublish } from "@/server/services/cad";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.publish");
    return ok(await rollbackCadPublish(context, params.id, await parseJson(request, cadRollbackSchema)));
  } catch (error) {
    return apiError(error);
  }
}
