import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { submitTaskForVerification } from "@/server/services/development";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "development.manage");
    return ok(await submitTaskForVerification(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
