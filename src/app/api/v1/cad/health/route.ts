import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { getCadDependencyHealth } from "@/server/services/cad-health";

export async function GET(request: NextRequest) {
  try {
    await getRequestContext(request, "cad.upload");
    return ok(await getCadDependencyHealth());
  } catch (error) {
    return apiError(error);
  }
}
