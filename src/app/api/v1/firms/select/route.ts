import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson } from "@/server/api";
import { getSessionUser } from "@/server/session";
import { selectFirm } from "@/server/services/firms";

const schema = z.object({ tenantId: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      const error = new Error("Unauthenticated");
      error.name = "UnauthorizedError";
      throw error;
    }
    const result = await selectFirm(session, (await parseJson(request, schema)).tenantId);
    const response = NextResponse.json({ ok: true, data: result.firm });
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto === "https" || request.nextUrl.protocol === "https:";
    const secureCookie = process.env.SESSION_COOKIE_SECURE
      ? process.env.SESSION_COOKIE_SECURE === "true"
      : isHttps;
    response.cookies.set("kalman_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
