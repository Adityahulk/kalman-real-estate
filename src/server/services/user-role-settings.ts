import { AuditAction, Prisma, Role, UserFieldType } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { ALL_PERMISSIONS, normalizePermissions, permissionsByRole } from "../rbac";
import { ASSIGNABLE_ROLES } from "./users";

const resourceSchema = z.enum(["department", "designation", "role", "field"]);
const nullableId = z.string().min(1).nullable().optional();

export const createUserSettingSchema = z.object({
  resource: resourceSchema,
  name: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
  departmentId: nullableId,
  designationId: nullableId,
  description: z.string().trim().optional(),
  baseRole: z.nativeEnum(Role).optional(),
  permissions: z.array(z.string()).optional(),
  type: z.nativeEnum(UserFieldType).optional(),
  required: z.boolean().optional(),
});

export const updateUserSettingSchema = createUserSettingSchema.extend({
  id: z.string().min(1),
});

export const deleteUserSettingSchema = z.object({
  resource: resourceSchema,
  id: z.string().min(1),
});

export async function listUserRoleSettings(context: RequestContext) {
  assertSuperAdmin(context);
  const [departments, designations, roles, fields] = await Promise.all([
    prisma.department.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({ where: { tenantId: context.tenantId }, orderBy: [{ departmentId: "asc" }, { name: "asc" }] }),
    prisma.customRole.findMany({ where: { tenantId: context.tenantId }, orderBy: { name: "asc" } }),
    prisma.userFieldDefinition.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" } }),
  ]);
  return {
    departments,
    designations,
    roles,
    fields,
    permissions: ALL_PERMISSIONS,
    baseRoles: ASSIGNABLE_ROLES.map((role) => ({ role, permissions: permissionsByRole[role] })),
  };
}

export async function createUserSetting(context: RequestContext, input: z.infer<typeof createUserSettingSchema>) {
  assertSuperAdmin(context);
  let result: { id: string };
  if (input.resource === "department") {
    result = await prisma.department.create({
      data: { tenantId: context.tenantId, name: required(input.name, "Department name is required.") },
    });
  } else if (input.resource === "designation") {
    const departmentId = required(input.departmentId, "Select a department.");
    await prisma.department.findFirstOrThrow({ where: { id: departmentId, tenantId: context.tenantId } });
    result = await prisma.designation.create({
      data: { tenantId: context.tenantId, departmentId, name: required(input.name, "Designation name is required.") },
    });
  } else if (input.resource === "role") {
    const baseRole = input.baseRole ?? Role.VIEWER;
    assertAssignableRole(baseRole);
    await assertOrganizationIds(context, input.departmentId, input.designationId);
    result = await prisma.customRole.create({
      data: {
        tenantId: context.tenantId,
        name: required(input.name, "Role name is required."),
        description: input.description || null,
        baseRole,
        permissions: validPermissions(input.permissions ?? permissionsByRole[baseRole]) as Prisma.InputJsonValue,
        departmentId: input.departmentId || null,
        designationId: input.designationId || null,
      },
    });
  } else {
    const label = required(input.label, "Field label is required.");
    result = await prisma.userFieldDefinition.create({
      data: {
        tenantId: context.tenantId,
        label,
        key: await uniqueFieldKey(context.tenantId, label),
        type: input.type ?? UserFieldType.TEXT,
        required: input.required ?? false,
      },
    });
  }
  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: settingEntity(input.resource),
    entityId: result.id,
    after: result as Prisma.InputJsonValue,
  });
  return result;
}

export async function updateUserSetting(context: RequestContext, input: z.infer<typeof updateUserSettingSchema>) {
  assertSuperAdmin(context);
  let result: { id: string };
  if (input.resource === "department") {
    await prisma.department.findFirstOrThrow({ where: { id: input.id, tenantId: context.tenantId } });
    result = await prisma.department.update({ where: { id: input.id }, data: { name: input.name } });
  } else if (input.resource === "designation") {
    await prisma.designation.findFirstOrThrow({ where: { id: input.id, tenantId: context.tenantId } });
    if (input.departmentId) {
      await prisma.department.findFirstOrThrow({ where: { id: input.departmentId, tenantId: context.tenantId } });
    }
    result = await prisma.designation.update({
      where: { id: input.id },
      data: { name: input.name, departmentId: input.departmentId ?? undefined },
    });
  } else if (input.resource === "role") {
    await prisma.customRole.findFirstOrThrow({ where: { id: input.id, tenantId: context.tenantId } });
    if (input.baseRole) assertAssignableRole(input.baseRole);
    await assertOrganizationIds(context, input.departmentId, input.designationId);
    result = await prisma.customRole.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        baseRole: input.baseRole,
        permissions: input.permissions ? validPermissions(input.permissions) as Prisma.InputJsonValue : undefined,
        departmentId: input.departmentId === undefined ? undefined : input.departmentId,
        designationId: input.designationId === undefined ? undefined : input.designationId,
      },
    });
  } else {
    await prisma.userFieldDefinition.findFirstOrThrow({ where: { id: input.id, tenantId: context.tenantId } });
    result = await prisma.userFieldDefinition.update({
      where: { id: input.id },
      data: { label: input.label, type: input.type, required: input.required },
    });
  }
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: settingEntity(input.resource),
    entityId: input.id,
    after: result as Prisma.InputJsonValue,
  });
  return result;
}

export async function deleteUserSetting(context: RequestContext, input: z.infer<typeof deleteUserSettingSchema>) {
  assertSuperAdmin(context);
  if (input.resource === "department") {
    await prisma.department.deleteMany({ where: { id: input.id, tenantId: context.tenantId } });
  } else if (input.resource === "designation") {
    await prisma.designation.deleteMany({ where: { id: input.id, tenantId: context.tenantId } });
  } else if (input.resource === "role") {
    await prisma.customRole.deleteMany({ where: { id: input.id, tenantId: context.tenantId } });
  } else {
    await prisma.userFieldDefinition.deleteMany({ where: { id: input.id, tenantId: context.tenantId } });
  }
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: settingEntity(input.resource),
    entityId: input.id,
  });
  return { id: input.id };
}

function assertSuperAdmin(context: RequestContext) {
  if (context.role !== Role.SUPER_ADMIN) {
    const error = new Error("Only a Super Admin can manage user and role settings.");
    error.name = "ForbiddenError";
    throw error;
  }
}

function assertAssignableRole(role: Role) {
  if (!ASSIGNABLE_ROLES.includes(role)) {
    const error = new Error("That base role cannot be assigned.");
    error.name = "BadRequestError";
    throw error;
  }
}

async function assertOrganizationIds(context: RequestContext, departmentId?: string | null, designationId?: string | null) {
  const [department, designation] = await Promise.all([
    departmentId ? prisma.department.findFirstOrThrow({ where: { id: departmentId, tenantId: context.tenantId } }) : null,
    designationId ? prisma.designation.findFirstOrThrow({ where: { id: designationId, tenantId: context.tenantId } }) : null,
  ]);
  if (department && designation && designation.departmentId !== department.id) {
    const error = new Error("The designation must belong to the selected department.");
    error.name = "BadRequestError";
    throw error;
  }
}

function validPermissions(value: unknown) {
  return normalizePermissions(value) ?? [];
}

function required<T>(value: T | null | undefined, message: string): T {
  if (!value) {
    const error = new Error(message);
    error.name = "BadRequestError";
    throw error;
  }
  return value;
}

function settingEntity(resource: z.infer<typeof resourceSchema>) {
  return resource === "field" ? "UserFieldDefinition" : resource[0].toUpperCase() + resource.slice(1);
}

async function uniqueFieldKey(tenantId: string, label: string) {
  const root = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
  let key = root;
  let suffix = 2;
  while (await prisma.userFieldDefinition.findUnique({ where: { tenantId_key: { tenantId, key } }, select: { id: true } })) {
    key = `${root}_${suffix++}`;
  }
  return key;
}
