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

const firmAssignmentSchema = z.object({
  tenantId: z.string().min(1),
  allProjects: z.boolean().default(true),
  projectIds: z.array(z.string().min(1)).default([]),
}).superRefine((assignment, context) => {
  if (!assignment.allProjects && assignment.projectIds.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["projectIds"], message: "Select at least one project, or allow all projects in this firm." });
  }
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
    firmAssignments: z.array(firmAssignmentSchema).min(1).optional(),
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
  reassignToId: z.string().optional().nullable(),
  firmAssignments: z.array(firmAssignmentSchema).min(1).optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

export async function listUsers(context: RequestContext) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { tenantId: context.tenantId },
        { firmMemberships: { some: { tenantId: context.tenantId } } },
      ],
    },
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
      firmMemberships: {
        select: { tenantId: true, role: true, allProjects: true, tenant: { select: { name: true } } },
        orderBy: { tenant: { name: "asc" } },
      },
      projectMemberships: {
        select: { tenantId: true, projectId: true, project: { select: { name: true } } },
        orderBy: { project: { name: "asc" } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const canManagePortfolio = context.role === Role.SUPER_ADMIN || context.role === Role.PLATFORM_ADMIN || context.role === Role.BUILDER_OWNER;
  const [customRoles, departments, designations, userFields, firms] = await Promise.all([
    prisma.customRole.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.userFieldDefinition.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.tenant.findMany({
      where: canManagePortfolio ? undefined : { id: context.tenantId },
      select: {
        id: true,
        name: true,
        projects: { where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const roles = context.role === Role.SUPER_ADMIN || context.role === Role.PLATFORM_ADMIN
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter((role) => role !== Role.SUPER_ADMIN);
  return { users, roles, customRoles, departments, designations, userFields, firms };
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
  assertRoleCanBeAssigned(context, organization.role);
  const assignments = await resolveFirmAssignments(context, input.firmAssignments);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: assignments.find((assignment) => assignment.tenantId === context.tenantId)?.tenantId ?? assignments[0].tenantId,
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
      firmMemberships: {
        create: assignments.map((assignment) => ({ tenantId: assignment.tenantId, role: organization.role, allProjects: assignment.allProjects })),
      },
      projectMemberships: {
        create: assignments.flatMap((assignment) => assignment.projectIds.map((projectId) => ({ tenantId: assignment.tenantId, projectId }))),
      },
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
  const before = await prisma.user.findFirstOrThrow({
    where: { id, OR: [{ tenantId: context.tenantId }, { firmMemberships: { some: { tenantId: context.tenantId } } }] },
  });
  // Guard against locking yourself out or demoting the account you are signed in as by accident.
  if (id === context.userId && input.status === UserStatus.DISABLED) {
    const error = new Error("You cannot disable your own account.");
    error.name = "BadRequestError";
    throw error;
  }
  const crmWorkload = input.status === UserStatus.DISABLED ? await activeCrmWorkload(context.tenantId, id) : null;
  if (crmWorkload?.total && !input.reassignToId) {
    const error = new Error(`This employee still has ${crmWorkload.leads.length} active leads, ${crmWorkload.followUps} follow-ups, ${crmWorkload.visits} visits, and ${crmWorkload.tickets} tickets. Select an active replacement before deactivating them.`);
    error.name = "BadRequestError";
    throw error;
  }
  if (input.reassignToId) {
    if (input.reassignToId === id) {
      const error = new Error("Select a different employee for reassignment."); error.name = "BadRequestError"; throw error;
    }
    await prisma.user.findFirstOrThrow({ where: { id: input.reassignToId, tenantId: context.tenantId, status: UserStatus.ACTIVE } });
  }
  const organization = await resolveOrganization(context, {
    role: input.role ?? before.role,
    customRoleId: input.customRoleId === undefined ? before.customRoleId : input.customRoleId,
    departmentId: input.departmentId === undefined ? before.departmentId : input.departmentId,
    designationId: input.designationId === undefined ? before.designationId : input.designationId,
  });
  const assignments = input.firmAssignments
    ? await resolveFirmAssignments(context, input.firmAssignments)
    : null;
  assertRoleCanBeAssigned(context, organization.role);
  if (id === context.userId && assignments && !assignments.some((assignment) => assignment.tenantId === context.tenantId)) {
    const error = new Error("You cannot remove your own access to the firm you are currently using.");
    error.name = "BadRequestError";
    throw error;
  }
  const user = await prisma.$transaction(async (tx) => {
    if (assignments) {
      await tx.userProjectMembership.deleteMany({ where: { userId: id } });
      await tx.userFirmMembership.deleteMany({ where: { userId: id } });
      await tx.userFirmMembership.createMany({
        data: assignments.map((assignment) => ({ userId: id, tenantId: assignment.tenantId, role: organization.role, allProjects: assignment.allProjects })),
      });
      const projectAssignments = assignments.flatMap((assignment) => assignment.projectIds.map((projectId) => ({ userId: id, tenantId: assignment.tenantId, projectId })));
      if (projectAssignments.length) await tx.userProjectMembership.createMany({ data: projectAssignments });
    }
    return tx.user.update({
      where: { id },
      data: {
      tenantId: assignments ? (assignments.find((assignment) => assignment.tenantId === context.tenantId)?.tenantId ?? assignments[0].tenantId) : undefined,
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
  });
  if (crmWorkload?.total && input.reassignToId) await reassignCrmWorkload(context, id, input.reassignToId, crmWorkload.leads);
  // Keep the firm-membership role in sync with the primary role so RBAC stays consistent.
  if (!assignments && organization.role !== before.role) {
    await prisma.userFirmMembership.updateMany({
      where: { userId: id },
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

type ResolvedFirmAssignment = { tenantId: string; allProjects: boolean; projectIds: string[] };

async function resolveFirmAssignments(
  context: RequestContext,
  requested: z.infer<typeof firmAssignmentSchema>[] | undefined,
): Promise<ResolvedFirmAssignment[]> {
  const assignments = requested?.length
    ? requested
    : [{ tenantId: context.tenantId, allProjects: true, projectIds: [] }];
  const uniqueTenantIds = [...new Set(assignments.map((assignment) => assignment.tenantId))];
  if (uniqueTenantIds.length !== assignments.length) {
    const error = new Error("Each firm can only be assigned once.");
    error.name = "BadRequestError";
    throw error;
  }
  const canManagePortfolio = context.role === Role.SUPER_ADMIN || context.role === Role.PLATFORM_ADMIN || context.role === Role.BUILDER_OWNER;
  if (!canManagePortfolio && uniqueTenantIds.some((tenantId) => tenantId !== context.tenantId)) {
    const error = new Error("You can only assign users to the firm you are currently managing.");
    error.name = "ForbiddenError";
    throw error;
  }
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: uniqueTenantIds } },
    select: { id: true, projects: { select: { id: true } } },
  });
  if (tenants.length !== uniqueTenantIds.length) {
    const error = new Error("One or more selected firms no longer exist.");
    error.name = "BadRequestError";
    throw error;
  }
  const projectIdsByTenant = new Map(tenants.map((tenant) => [tenant.id, new Set(tenant.projects.map((project) => project.id))]));
  return assignments.map((assignment) => {
    const projectIds = assignment.allProjects ? [] : [...new Set(assignment.projectIds)];
    const allowedProjectIds = projectIdsByTenant.get(assignment.tenantId)!;
    if (projectIds.some((projectId) => !allowedProjectIds.has(projectId))) {
      const error = new Error("A selected project does not belong to its assigned firm.");
      error.name = "BadRequestError";
      throw error;
    }
    return { tenantId: assignment.tenantId, allProjects: assignment.allProjects, projectIds };
  });
}

function assertRoleCanBeAssigned(context: RequestContext, role: Role) {
  if (role === Role.SUPER_ADMIN && context.role !== Role.SUPER_ADMIN && context.role !== Role.PLATFORM_ADMIN) {
    const error = new Error("Only a Super Admin can grant Super Admin access.");
    error.name = "ForbiddenError";
    throw error;
  }
}

async function activeCrmWorkload(tenantId: string, userId: string) {
  const [leads, followUps, visits, tickets] = await Promise.all([
    prisma.crmLead.findMany({ where: { tenantId, archivedAt: null, OR: [{ assignedCallerId: userId }, { assignedSalespersonId: userId }] }, select: { id: true, assignedCallerId: true, assignedSalespersonId: true } }),
    prisma.crmFollowUp.count({ where: { tenantId, assignedToId: userId, status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.crmVisit.count({ where: { tenantId, assignedSalespersonId: userId, status: { in: ["PROPOSED", "SCHEDULED", "CONFIRMED"] } } }),
    prisma.crmTicket.count({ where: { tenantId, assignedToId: userId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);
  return { leads, followUps, visits, tickets, total: leads.length + followUps + visits + tickets };
}

async function reassignCrmWorkload(context: RequestContext, previousUserId: string, nextUserId: string, leads: Array<{ id: string; assignedCallerId: string | null; assignedSalespersonId: string | null }>) {
  await prisma.$transaction(async (tx) => {
    for (const lead of leads) {
      const wasCaller = lead.assignedCallerId === previousUserId;
      const wasSalesperson = lead.assignedSalespersonId === previousUserId;
      await tx.crmLead.update({ where: { id: lead.id }, data: { assignedCallerId: wasCaller ? nextUserId : undefined, assignedSalespersonId: wasSalesperson ? nextUserId : undefined } });
      if (wasCaller) await tx.crmLeadAssignment.create({ data: { tenantId: context.tenantId, leadId: lead.id, assignmentType: "CALLER", previousUserId, assignedUserId: nextUserId, reason: "Employee deactivated", assignedById: context.userId } });
      if (wasSalesperson) await tx.crmLeadAssignment.create({ data: { tenantId: context.tenantId, leadId: lead.id, assignmentType: "SALESPERSON", previousUserId, assignedUserId: nextUserId, reason: "Employee deactivated", assignedById: context.userId } });
      await tx.crmActivity.create({ data: { tenantId: context.tenantId, leadId: lead.id, type: "ASSIGNED", title: "Work reassigned after employee deactivation", notes: "Open CRM work moved to an active employee; prior history was preserved.", actorUserId: context.userId, metadata: { previousUserId, nextUserId } } });
    }
    await tx.crmFollowUp.updateMany({ where: { tenantId: context.tenantId, assignedToId: previousUserId, status: { in: ["PENDING", "OVERDUE"] } }, data: { assignedToId: nextUserId } });
    await tx.crmVisit.updateMany({ where: { tenantId: context.tenantId, assignedSalespersonId: previousUserId, status: { in: ["PROPOSED", "SCHEDULED", "CONFIRMED"] } }, data: { assignedSalespersonId: nextUserId } });
    await tx.crmTicket.updateMany({ where: { tenantId: context.tenantId, assignedToId: previousUserId, status: { in: ["OPEN", "IN_PROGRESS"] } }, data: { assignedToId: nextUserId } });
  });
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
  const before = await prisma.user.findFirstOrThrow({
    where: { id, OR: [{ tenantId: context.tenantId }, { firmMemberships: { some: { tenantId: context.tenantId } } }] },
  });
  const crmWorkload = await activeCrmWorkload(context.tenantId, id);
  if (crmWorkload.total) {
    const error = new Error("This user has active CRM work. Use Deactivate and select a replacement employee first.");
    error.name = "BadRequestError";
    throw error;
  }
  const user = await prisma.$transaction(async (tx) => {
    await tx.deviceToken.deleteMany({ where: { tenantId: context.tenantId, userId: id } });
    return tx.user.update({
      where: { id },
      data: { status: UserStatus.DISABLED },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "User",
    entityId: id,
    before: { id: before.id, name: before.name, email: before.email, role: before.role } as Prisma.InputJsonValue,
  });
  return { id, archived: true, status: user.status };
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
