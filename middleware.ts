import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "development-secret-change-me");

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("kalman_session")?.value;
  const loginUrl = new URL("/login", request.url);

  if (!token) {
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("kalman_session");
    return response;
  }
}

export const config = {
  matcher: ["/app/:path*", "/owner/:path*", "/firms/:path*"],
};
