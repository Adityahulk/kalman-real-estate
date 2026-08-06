import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/server/api";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
    response.cookies.delete("kalman_session");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
