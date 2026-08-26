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
  /** null means every project in the selected firm; an array is an explicit project scope. */
  projectIds?: string[] | null;
};

export function hasPortfolioFirmAccess(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.BUILDER_OWNER;
}

export async function resolveSessionTenantId(input: {
  selectedTenantId: string;
  userId: string;
  userTenantId: string | null;
  role: Role;
}) {
  if (input.selectedTenantId === "__unselected__") return "__unselected__";

  if (hasPortfolioFirmAccess(input.role)) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.selectedTenantId },
      select: { id: true },
    });
    return tenant ? tenant.id : "__unselected__";
  }

  if (input.userTenantId === input.selectedTenantId) return input.selectedTenantId;

  const membership = await prisma.userFirmMembership.findUnique({
    where: {
      userId_tenantId: {
        userId: input.userId,
        tenantId: input.selectedTenantId,
      },
    },
    select: { id: true },
  });
  return membership ? input.selectedTenantId : "__unselected__";
}

export async function resolveUserProjectIds(input: {
  userId: string;
  tenantId: string;
  userTenantId: string | null;
  role: Role;
}): Promise<string[] | null> {
  if (hasPortfolioFirmAccess(input.role)) return null;

  const membership = await prisma.userFirmMembership.findUnique({
    where: { userId_tenantId: { userId: input.userId, tenantId: input.tenantId } },
    select: {
      allProjects: true,
      user: {
        select: {
          projectMemberships: {
            where: { tenantId: input.tenantId },
            select: { projectId: true },
          },
        },
      },
    },
  });
  // Existing direct-tenant accounts predate scoped memberships and retain full firm access.
  if (!membership) return input.userTenantId === input.tenantId ? null : [];
  if (membership.allProjects) return null;
  return membership.user.projectMemberships.map((item) => item.projectId);
}

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
  const tokenUser = await verifySessionToken((await cookies()).get("kalman_session")?.value);
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
  const tenantId = await resolveSessionTenantId({
    selectedTenantId: tokenUser.tenantId,
    userId: user.id,
    userTenantId: user.tenantId,
    role: user.role,
  });
  const projectIds = tenantId === "__unselected__"
    ? []
    : await resolveUserProjectIds({
        userId: user.id,
        tenantId,
        userTenantId: user.tenantId,
        role: user.role,
      });
  return {
    id: user.id,
    tenantId,
    role: user.role,
    email: user.email,
    permissions: normalizePermissions(user.customRole?.permissions),
    projectIds,
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
