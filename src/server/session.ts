import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { Role } from "@prisma/client";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "development-secret-change-me");

export type SessionUser = {
  id: string;
  tenantId: string;
  role: Role;
  email: string;
};

export async function verifySessionToken(token?: string): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.tenantId || !payload.role || !payload.email) return null;
    return {
      id: String(payload.sub),
      tenantId: String(payload.tenantId),
      role: payload.role as Role,
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  return verifySessionToken(cookies().get("kalman_session")?.value);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}
