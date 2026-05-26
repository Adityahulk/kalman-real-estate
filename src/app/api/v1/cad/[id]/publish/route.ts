import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { publishCad } from "@/server/services/cad";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.publish");
    return ok(await publishCad(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
