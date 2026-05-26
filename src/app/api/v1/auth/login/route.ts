import { NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/server/api";
import { login } from "@/server/services/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, schema);
    const result = await login(input.email, input.password);
    const response = NextResponse.json({ ok: true, data: result }, { status: 201 });
    response.cookies.set("kalman_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
