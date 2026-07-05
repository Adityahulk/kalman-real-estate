import { AuditAction, Prisma, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";

// Roles a firm super-admin/owner can assign from the user-management screen. PLATFORM_ADMIN is
// intentionally excluded — that is a platform-level, tenant-less role, not a firm membership role.
export const ASSIGNABLE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.BUILDER_OWNER,
  Role.BUILDER_ADMIN,
  Role.ALLOTMENT_EXECUTIVE,
  Role.APPROVING_AUTHORITY,
  Role.AUTHORIZED_SIGNATORY,
  Role.HEAD_ENGINEER,
  Role.SITE_ENGINEER,
  Role.LIAISON_OFFICER,
  Role.FINANCE_MANAGER,
  Role.MARKETING_HEAD,
  Role.VIDEOGRAPHER,
  Role.EDITOR,
  Role.CONTRACTOR,
  Role.PLOT_OWNER,
  Role.VIEWER,
];

const roleEnum = z.nativeEnum(Role).refine((role) => ASSIGNABLE_ROLES.includes(role), {
  message: "That role cannot be assigned here.",
});

export const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    loginId: z.string().min(3).optional().or(z.literal("")),
    phone: z.string().optional(),
    role: roleEnum,
    password: z.string().min(6),
  })
  .refine((value) => Boolean(value.email) || Boolean(value.loginId), {
    message: "Provide an email or a login ID.",
    path: ["loginId"],
  });

export const updateUserSchema = z.object({
  role: roleEnum.optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

export async function listUsers(context: RequestContext) {
  const users = await prisma.user.findMany({
    where: { tenantId: context.tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      loginId: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return { users, roles: ASSIGNABLE_ROLES };
}

export async function createUser(context: RequestContext, input: z.infer<typeof createUserSchema>) {
  const email = input.email ? input.email.toLowerCase().trim() : null;
  const loginId = input.loginId ? input.loginId.trim() : null;

  // Emails are globally unique; a synthetic placeholder keeps the NOT NULL/unique column satisfied
  // for login-ID-only accounts (like the super admin) without colliding.
  const resolvedEmail = email ?? `${loginId!.toLowerCase()}@users.local`;
  const clash = await prisma.user.findFirst({
    where: { OR: [{ email: resolvedEmail }, ...(loginId ? [{ loginId }] : [])] },
    select: { id: true },
  });
  if (clash) {
    const error = new Error("A user with that email or login ID already exists.");
    error.name = "BadRequestError";
    throw error;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: context.tenantId,
      email: resolvedEmail,
      loginId,
      passwordHash,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      role: input.role,
      status: UserStatus.ACTIVE,
      firmMemberships: { create: { tenantId: context.tenantId, role: input.role } },
    },
    select: { id: true, name: true, email: true, loginId: true, role: true, status: true },
  });
  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "User",
    entityId: user.id,
    after: user as unknown as Prisma.InputJsonValue,
  });
  return user;
}

export async function updateUser(context: RequestContext, id: string, input: z.infer<typeof updateUserSchema>) {
  const before = await prisma.user.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  // Guard against locking yourself out or demoting the account you are signed in as by accident.
  if (id === context.userId && input.status === UserStatus.DISABLED) {
    const error = new Error("You cannot disable your own account.");
    error.name = "BadRequestError";
    throw error;
  }
  const user = await prisma.user.update({
    where: { id },
    data: {
      role: input.role ?? before.role,
      status: input.status ?? before.status,
    },
    select: { id: true, name: true, email: true, loginId: true, role: true, status: true },
  });
  // Keep the firm-membership role in sync with the primary role so RBAC stays consistent.
  if (input.role) {
    await prisma.userFirmMembership.updateMany({
      where: { userId: id, tenantId: context.tenantId },
      data: { role: input.role },
    });
  }
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "User",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: user as unknown as Prisma.InputJsonValue,
  });
  return user;
}

export async function resetUserPassword(context: RequestContext, id: string, input: z.infer<typeof resetPasswordSchema>) {
  const target = await prisma.user.findFirstOrThrow({ where: { id, tenantId: context.tenantId }, select: { id: true } });
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "User",
    entityId: id,
    after: { id, passwordReset: true } as unknown as Prisma.InputJsonValue,
  });
  return { ok: true };
}
