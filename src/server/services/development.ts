import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { assertPermission, hasPermission, normalizePermissions } from "../rbac";
import { createNotification, notifyRoleWithPermission } from "./notifications";

// Engineering task lifecycle statuses. SiteAsset.status is a free-form string, so these extend the
// existing PLANNED/IN_PROGRESS/COMPLETED set with no enum migration.
export const TASK_STATUS = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  SENT_FOR_VERIFICATION: "SENT_FOR_VERIFICATION",
  COMPLETED: "COMPLETED",
  RETURNED: "RETURNED",
  CLOSED: "CLOSED",
} as const;

export const progressSchema = z.object({
  areaDone: z.number().nonnegative(),
  progressPct: z.number().min(0).max(100).optional(),
  recordedAt: z.string().datetime().optional(),
  summary: z.string().min(1),
  photoFileIds: z.array(z.string()).optional(),
  visibleToOwner: z.boolean().default(false),
});

export async function updateSiteAssetProgress(context: RequestContext, siteAssetId: string, input: z.infer<typeof progressSchema>) {
  const assetBefore = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  if ([TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED].includes(assetBefore.status as typeof TASK_STATUS.COMPLETED | typeof TASK_STATUS.CLOSED)) {
    throwBadRequest("Completed or closed tasks cannot receive new progress updates.");
  }
  if (input.photoFileIds?.length) await assertFilesInTenant(context, input.photoFileIds);
  const totalArea = assetBefore.totalArea ? Number(assetBefore.totalArea) : 0;
  const progressPct = totalArea > 0 ? Math.max(0, Math.min(100, Math.round((input.areaDone / totalArea) * 100))) : assetBefore.progressPct;
  const [asset, update] = await prisma.$transaction([
    prisma.siteAsset.update({
      where: { id: siteAssetId },
      data: {
        progressPct,
        status: TASK_STATUS.IN_PROGRESS,
      },
    }),
    prisma.progressUpdate.create({
      data: {
        tenantId: context.tenantId,
        parentType: "SiteAsset",
        parentId: siteAssetId,
        progressPct,
        quantityDone: input.areaDone,
        summary: input.summary,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
        photoFileIds: input.photoFileIds as Prisma.InputJsonValue,
        visibleToOwner: input.visibleToOwner,
        createdById: context.userId,
      },
    }),
  ]);
  await writeAuditEvent(context, { action: AuditAction.PROGRESS_UPDATE, entityType: "SiteAsset", entityId: siteAssetId, after: update });
  await createNotification(context, {
    title: "Site progress updated",
    body: `${asset.name} is now ${progressPct}% complete.`,
    data: { siteAssetId, progressUpdateId: update.id },
  });
  return { asset, update };
}

export async function updateChecklistProgress(context: RequestContext, checklistItemId: string, input: z.infer<typeof progressSchema>) {
  await prisma.checklistItem.findFirstOrThrow({ where: { id: checklistItemId, tenantId: context.tenantId } });
  if (input.photoFileIds?.length) await assertFilesInTenant(context, input.photoFileIds);
  const progressPct = input.progressPct ?? Math.max(0, Math.min(100, Math.round(input.areaDone)));
  const [item, update] = await prisma.$transaction([
    prisma.checklistItem.update({
      where: { id: checklistItemId },
      data: { progressPct, status: progressPct >= 100 ? "DONE" : "IN_PROGRESS", completedAt: progressPct >= 100 ? new Date() : undefined },
    }),
    prisma.progressUpdate.create({
      data: {
        tenantId: context.tenantId,
        parentType: "ChecklistItem",
        parentId: checklistItemId,
        progressPct,
        summary: input.summary,
        quantityDone: input.areaDone,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
        photoFileIds: input.photoFileIds as Prisma.InputJsonValue,
        visibleToOwner: input.visibleToOwner,
        createdById: context.userId,
      },
    }),
  ]);
  await writeAuditEvent(context, { action: AuditAction.PROGRESS_UPDATE, entityType: "ChecklistItem", entityId: checklistItemId, after: update });
  await createNotification(context, {
    title: "Plot checklist updated",
    body: `${item.label} is now ${progressPct}% complete.`,
    data: { checklistItemId, progressUpdateId: update.id },
  });
  return { item, update };
}

export const issueSchema = z.object({
  parentType: z.string(),
  parentId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  assignedToId: z.string().optional(),
});

export async function createIssue(context: RequestContext, input: z.infer<typeof issueSchema>) {
  await assertParentInTenant(context, input.parentType, input.parentId);
  const issue = await prisma.issue.create({
    data: {
      tenantId: context.tenantId,
      ...input,
      createdById: context.userId,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "Issue", entityId: issue.id, after: issue });
  return issue;
}

export const progressPhotoSchema = z.object({
  fileAssetIds: z.array(z.string()).min(1),
  summary: z.string().default("Progress photos uploaded."),
  visibleToOwner: z.boolean().default(false),
});

export async function addProgressPhotos(context: RequestContext, progressId: string, input: z.infer<typeof progressPhotoSchema>) {
  const progress = await prisma.progressUpdate.findFirstOrThrow({
    where: { id: progressId, tenantId: context.tenantId },
  });
  await assertFilesInTenant(context, input.fileAssetIds);
  const existing = Array.isArray(progress.photoFileIds) ? progress.photoFileIds : [];
  const updated = await prisma.progressUpdate.update({
    where: { id: progressId },
    data: {
      photoFileIds: [...existing, ...input.fileAssetIds] as Prisma.InputJsonValue,
      summary: input.summary || progress.summary,
      visibleToOwner: input.visibleToOwner,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.UPLOAD, entityType: "ProgressUpdate", entityId: progressId, after: updated });
  return updated;
}

export const developmentTaskSchema = z.object({
  name: z.string().min(2),
  totalArea: z.number().nonnegative(),
  units: z.string().min(1).max(40),
  deadline: z.string().datetime().optional(),
  category: z.string().min(2),
  assignedToId: z.string().optional().nullable(),
  status: z.enum([
    TASK_STATUS.PLANNED,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.SENT_FOR_VERIFICATION,
    TASK_STATUS.COMPLETED,
    TASK_STATUS.RETURNED,
    TASK_STATUS.CLOSED,
  ]).default(TASK_STATUS.PLANNED),
});

export async function updateDevelopmentTask(context: RequestContext, siteAssetId: string, input: z.infer<typeof developmentTaskSchema>) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  if ((input.assignedToId ?? null) !== (before.assignedToId ?? null)) {
    assertPermission(context.role, "engineering.assign", context.permissions);
  }
  if (input.assignedToId) await assertActiveTenantUser(context, input.assignedToId);
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: {
      name: input.name,
      type: input.category,
      totalArea: input.totalArea,
      units: input.units,
      deadline: input.deadline ? new Date(input.deadline) : null,
      assignedToId: input.assignedToId || null,
      contractorId: null,
      status: input.status,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "SiteAsset",
    entityId: siteAssetId,
    before: before as unknown as Prisma.InputJsonValue,
    after: task as unknown as Prisma.InputJsonValue,
  });
  return task;
}

export async function assignDevelopmentTask(context: RequestContext, siteAssetId: string, assignedToId: string) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  if ([TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED].includes(before.status as typeof TASK_STATUS.COMPLETED | typeof TASK_STATUS.CLOSED)) {
    throwBadRequest("Completed or closed tasks cannot be reassigned.");
  }
  const assignee = await assertActiveTenantUser(context, assignedToId);
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: {
      assignedToId,
      contractorId: null,
      status: TASK_STATUS.IN_PROGRESS,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.ASSIGN,
    entityType: "SiteAsset",
    entityId: siteAssetId,
    before: before as unknown as Prisma.InputJsonValue,
    after: { ...task, assignedToName: assignee.name } as unknown as Prisma.InputJsonValue,
  });
  await createNotification(context, {
    userId: assignee.id,
    title: before.assignedToId ? "Task reassigned" : "Task assigned",
    body: `You have been assigned "${task.name}"${task.deadline ? ` (due ${task.deadline.toLocaleDateString()})` : ""}.`,
    data: { siteAssetId: task.id, status: task.status },
  });
  return task;
}

export async function markDevelopmentTaskComplete(context: RequestContext, siteAssetId: string) {
  return submitTaskForVerification(context, siteAssetId);
}

// Head Engineer creates a task and assigns a site engineer + contractor with a priority and deadline.
export const createDevelopmentTaskSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2),
  category: z.string().min(2),
  totalArea: z.number().nonnegative().optional(),
  units: z.string().max(40).optional(),
  deadline: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignedToId: z.string().optional(),
  contractorId: z.string().optional(),
});

export async function createDevelopmentTask(context: RequestContext, input: z.infer<typeof createDevelopmentTaskSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: input.projectId, tenantId: context.tenantId } });
  if (input.assignedToId) {
    assertPermission(context.role, "engineering.assign", context.permissions);
    await assertActiveTenantUser(context, input.assignedToId);
  }
  const task = await prisma.siteAsset.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      name: input.name,
      type: input.category,
      totalArea: input.totalArea ?? null,
      units: input.units || null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      priority: input.priority,
      assignedToId: input.assignedToId || null,
      contractorId: input.contractorId || null,
      createdById: context.userId,
      status: input.assignedToId ? TASK_STATUS.IN_PROGRESS : TASK_STATUS.PLANNED,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "SiteAsset",
    entityId: task.id,
    after: task as unknown as Prisma.InputJsonValue,
  });
  if (task.assignedToId) {
    await createNotification(context, {
      userId: task.assignedToId,
      title: "Task assigned",
      body: `You have been assigned "${task.name}"${task.deadline ? ` (due ${task.deadline.toLocaleDateString()})` : ""}.`,
      data: { siteAssetId: task.id, status: task.status },
    });
  }
  return task;
}

// Site Engineer sends a task to the Head Engineer for verification once work is done.
export async function submitTaskForVerification(context: RequestContext, siteAssetId: string) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  if ([TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED].includes(before.status as typeof TASK_STATUS.COMPLETED | typeof TASK_STATUS.CLOSED)) {
    throwBadRequest("This task is already completed or closed.");
  }
  if (before.progressPct < 95) {
    throwBadRequest("Task progress must be at least 95% before it can be sent for approval.");
  }
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: { status: TASK_STATUS.SENT_FOR_VERIFICATION },
  });
  await writeAuditEvent(context, {
    action: AuditAction.SUBMIT,
    entityType: "SiteAsset",
    entityId: siteAssetId,
    before: before as unknown as Prisma.InputJsonValue,
    after: task as unknown as Prisma.InputJsonValue,
  });
  await notifyRoleWithPermission(context, "engineering.verify", {
    title: "Task completed and awaiting verification",
    body: `"${task.name}" has been marked complete and is awaiting your verification.`,
    data: { siteAssetId: task.id, status: task.status },
    excludeUserId: context.userId,
  });
  return task;
}

// Head Engineer verifies: approve → COMPLETED, or return → RETURNED with notes.
export const verifyDevelopmentTaskSchema = z.object({
  decision: z.enum(["APPROVE", "RETURN"]),
  notes: z.string().optional(),
});

export async function verifyDevelopmentTask(context: RequestContext, siteAssetId: string, input: z.infer<typeof verifyDevelopmentTaskSchema>) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  if (before.status !== TASK_STATUS.SENT_FOR_VERIFICATION) {
    throwBadRequest("Only tasks awaiting approval can be approved or returned.");
  }
  const approved = input.decision === "APPROVE";
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: {
      status: approved ? TASK_STATUS.COMPLETED : TASK_STATUS.RETURNED,
      progressPct: approved ? 100 : before.progressPct,
      verifiedById: approved ? context.userId : before.verifiedById,
      verifiedAt: approved ? new Date() : before.verifiedAt,
      verificationNotes: input.notes ?? before.verificationNotes,
    },
  });
  await writeAuditEvent(context, {
    action: approved ? AuditAction.VERIFY : AuditAction.RETURN,
    entityType: "SiteAsset",
    entityId: siteAssetId,
    before: before as unknown as Prisma.InputJsonValue,
    after: { ...task, notes: input.notes } as unknown as Prisma.InputJsonValue,
  });
  if (task.assignedToId) {
    await createNotification(context, {
      userId: task.assignedToId,
      title: approved ? "Task approved" : "Task returned",
      body: approved
        ? `"${task.name}" was verified and marked complete.`
        : `"${task.name}" was returned for rework${input.notes ? `: ${input.notes}` : "."}`,
      data: { siteAssetId: task.id, status: task.status },
    });
  }
  return task;
}

export async function deleteDevelopmentTask(context: RequestContext, siteAssetId: string) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: { archivedAt: new Date(), archiveReason: "Deleted from development task workflow." },
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "SiteAsset",
    entityId: siteAssetId,
    before: before as unknown as Prisma.InputJsonValue,
    after: task as unknown as Prisma.InputJsonValue,
  });
  return task;
}

export async function closeDevelopmentTask(context: RequestContext, siteAssetId: string) {
  const before = await prisma.siteAsset.findFirstOrThrow({
    where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null },
  });
  if (before.status === TASK_STATUS.CLOSED) throwBadRequest("This task is already closed.");
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: { status: TASK_STATUS.CLOSED },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "SiteAsset",
    entityId: siteAssetId,
    before: before as unknown as Prisma.InputJsonValue,
    after: { ...task, closedById: context.userId } as unknown as Prisma.InputJsonValue,
  });
  return task;
}

export async function listEngineeringAssignees(tenantId: string) {
  const users = await prisma.user.findMany({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      customRole: { select: { permissions: true } },
      department: { select: { name: true } },
      designation: { select: { name: true } },
    },
  });
  return users
    .filter((user) => hasPermission(user.role, "development.manage", normalizePermissions(user.customRole?.permissions)))
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department?.name ?? null,
      designation: user.designation?.name ?? null,
    }));
}

async function assertFilesInTenant(context: RequestContext, fileAssetIds: string[]) {
  const files = await prisma.fileAsset.findMany({
    where: { id: { in: fileAssetIds }, tenantId: context.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (files.length !== new Set(fileAssetIds).size) {
    throwBadRequest("One or more files are invalid for this tenant");
  }
}

async function assertActiveTenantUser(context: RequestContext, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId: context.tenantId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!user) throwBadRequest("Select an active user from this firm.");
  return user;
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}

async function assertParentInTenant(context: RequestContext, parentType: string, parentId: string) {
  if (parentType === "Plot") {
    await prisma.plot.findFirstOrThrow({ where: { id: parentId, tenantId: context.tenantId, archivedAt: null } });
    return;
  }
  if (parentType === "SiteAsset") {
    await prisma.siteAsset.findFirstOrThrow({ where: { id: parentId, tenantId: context.tenantId, archivedAt: null } });
    return;
  }
  if (parentType === "ChecklistItem") {
    await prisma.checklistItem.findFirstOrThrow({ where: { id: parentId, tenantId: context.tenantId } });
    return;
  }
  throw new Error("Unsupported issue parent type");
}
