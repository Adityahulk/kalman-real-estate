import { NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/server/api";
import { login } from "@/server/services/auth";

// Accept either an email or a login-ID under `identifier`. The legacy `email` field is
// still honoured so existing clients keep working. Password length isn't validated here
// (bcrypt does the real check) so short admin credentials like the super-admin's are allowed.
const schema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((value) => Boolean(value.identifier || value.email), {
    message: "Email or User ID is required",
    path: ["identifier"],
  });

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, schema);
    const result = await login((input.identifier ?? input.email)!, input.password);
    const response = NextResponse.json({ ok: true, data: result }, { status: 201 });
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
