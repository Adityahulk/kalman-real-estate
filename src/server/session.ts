import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { Role } from "@prisma/client";
import { prisma } from "./db";
import { normalizePermissions, Permission } from "./rbac";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "development-secret-change-me");

export type SessionUser = {
  id: string;
  tenantId: string;
  role: Role;
  email: string;
  permissions?: Permission[];
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
  const tokenUser = await verifySessionToken(cookies().get("kalman_session")?.value);
  if (!tokenUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: {
      id: true,
      tenantId: true,
      email: true,
      role: true,
      status: true,
      customRole: { select: { permissions: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    tenantId: user.tenantId ?? "__unselected__",
    role: user.role,
    email: user.email,
    permissions: normalizePermissions(user.customRole?.permissions),
  };
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
