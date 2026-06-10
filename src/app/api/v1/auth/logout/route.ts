import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
  response.cookies.delete("kalman_session");
  return response;
}
