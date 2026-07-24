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
    customRoleId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    designationId: z.string().optional().nullable(),
    profileData: z.record(z.unknown()).optional(),
    password: z.string().min(6),
  })
  .refine((value) => Boolean(value.email) || Boolean(value.loginId), {
    message: "Provide an email or a login ID.",
    path: ["loginId"],
  });

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  loginId: z.string().trim().min(3).optional().nullable(),
  phone: z.string().optional().nullable(),
  role: roleEnum.optional(),
  customRoleId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  designationId: z.string().optional().nullable(),
  profileData: z.record(z.unknown()).optional(),
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
      customRoleId: true,
      departmentId: true,
      designationId: true,
      profileData: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      customRole: { select: { id: true, name: true, permissions: true } },
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const [customRoles, departments, designations, userFields] = await Promise.all([
    prisma.customRole.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.userFieldDefinition.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" } }),
  ]);
  return { users, roles: ASSIGNABLE_ROLES, customRoles, departments, designations, userFields };
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

  const organization = await resolveOrganization(context, input);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: context.tenantId,
      email: resolvedEmail,
      loginId,
      passwordHash,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      role: organization.role,
      customRoleId: organization.customRoleId,
      departmentId: organization.departmentId,
      designationId: organization.designationId,
      profileData: (input.profileData ?? {}) as Prisma.InputJsonValue,
      status: UserStatus.ACTIVE,
      firmMemberships: { create: { tenantId: context.tenantId, role: organization.role } },
    },
    select: { id: true, name: true, email: true, loginId: true, role: true, customRoleId: true, departmentId: true, designationId: true, profileData: true, status: true },
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
  const organization = await resolveOrganization(context, {
    role: input.role ?? before.role,
    customRoleId: input.customRoleId === undefined ? before.customRoleId : input.customRoleId,
    departmentId: input.departmentId === undefined ? before.departmentId : input.departmentId,
    designationId: input.designationId === undefined ? before.designationId : input.designationId,
  });
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email?.toLowerCase().trim(),
      loginId: input.loginId === undefined ? undefined : input.loginId || null,
      phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
      role: organization.role,
      customRoleId: organization.customRoleId,
      departmentId: organization.departmentId,
      designationId: organization.designationId,
      profileData: input.profileData as Prisma.InputJsonValue | undefined,
      status: input.status ?? before.status,
    },
    select: { id: true, name: true, email: true, loginId: true, phone: true, role: true, customRoleId: true, departmentId: true, designationId: true, profileData: true, status: true },
  });
  // Keep the firm-membership role in sync with the primary role so RBAC stays consistent.
  if (organization.role !== before.role) {
    await prisma.userFirmMembership.updateMany({
      where: { userId: id, tenantId: context.tenantId },
      data: { role: organization.role },
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

export async function deleteUser(context: RequestContext, id: string) {
  if (context.role !== Role.SUPER_ADMIN) {
    const error = new Error("Only a Super Admin can delete user accounts.");
    error.name = "ForbiddenError";
    throw error;
  }
  if (id === context.userId) {
    const error = new Error("You cannot delete your own account.");
    error.name = "BadRequestError";
    throw error;
  }
  const before = await prisma.user.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  await prisma.$transaction(async (tx) => {
    await tx.fileAsset.updateMany({
      where: { tenantId: context.tenantId, ownerType: "User", ownerId: id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: context.userId, deleteReason: "User account deleted" },
    });
    await tx.notification.deleteMany({ where: { tenantId: context.tenantId, userId: id } });
    await tx.deviceToken.deleteMany({ where: { tenantId: context.tenantId, userId: id } });
    await tx.ownershipRecord.updateMany({ where: { createdById: id }, data: { createdById: null } });
    await tx.auditEvent.updateMany({ where: { actorUserId: id }, data: { actorUserId: null } });
    await tx.user.delete({ where: { id } });
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "User",
    entityId: id,
    before: { id: before.id, name: before.name, email: before.email, role: before.role } as Prisma.InputJsonValue,
  });
  return { id };
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

async function resolveOrganization(
  context: RequestContext,
  input: {
    role: Role;
    customRoleId?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
  },
) {
  const [customRole, department, designation] = await Promise.all([
    input.customRoleId
      ? prisma.customRole.findFirstOrThrow({ where: { id: input.customRoleId, tenantId: context.tenantId } })
      : null,
    input.departmentId
      ? prisma.department.findFirstOrThrow({ where: { id: input.departmentId, tenantId: context.tenantId } })
      : null,
    input.designationId
      ? prisma.designation.findFirstOrThrow({ where: { id: input.designationId, tenantId: context.tenantId } })
      : null,
  ]);
  if (designation && department && designation.departmentId !== department.id) {
    const error = new Error("The selected designation does not belong to the selected department.");
    error.name = "BadRequestError";
    throw error;
  }
  return {
    role: customRole?.baseRole ?? input.role,
    customRoleId: customRole?.id ?? null,
    departmentId: department?.id ?? customRole?.departmentId ?? null,
    designationId: designation?.id ?? customRole?.designationId ?? null,
  };
}
