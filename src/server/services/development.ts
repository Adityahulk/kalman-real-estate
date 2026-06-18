import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { createNotification } from "./notifications";

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
  if (input.photoFileIds?.length) await assertFilesInTenant(context, input.photoFileIds);
  const totalArea = assetBefore.totalArea ? Number(assetBefore.totalArea) : 0;
  const progressPct = totalArea > 0 ? Math.max(0, Math.min(100, Math.round((input.areaDone / totalArea) * 100))) : assetBefore.progressPct;
  const [asset, update] = await prisma.$transaction([
    prisma.siteAsset.update({
      where: { id: siteAssetId },
      data: {
        progressPct,
        status: progressPct >= 100 ? "COMPLETED" : "IN_PROGRESS",
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
  assignedTo: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]).default("PLANNED"),
});

export async function updateDevelopmentTask(context: RequestContext, siteAssetId: string, input: z.infer<typeof developmentTaskSchema>) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: {
      name: input.name,
      type: input.category,
      totalArea: input.totalArea,
      units: input.units,
      deadline: input.deadline ? new Date(input.deadline) : null,
      contractorId: input.assignedTo || null,
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

export async function assignDevelopmentTask(context: RequestContext, siteAssetId: string, assignedTo: string) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: {
      contractorId: assignedTo,
      status: "IN_PROGRESS",
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

export async function markDevelopmentTaskComplete(context: RequestContext, siteAssetId: string) {
  const before = await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId, archivedAt: null } });
  const task = await prisma.siteAsset.update({
    where: { id: siteAssetId },
    data: { progressPct: 100, status: "COMPLETED" },
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

async function assertFilesInTenant(context: RequestContext, fileAssetIds: string[]) {
  const files = await prisma.fileAsset.findMany({
    where: { id: { in: fileAssetIds }, tenantId: context.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (files.length !== new Set(fileAssetIds).size) {
    throwBadRequest("One or more files are invalid for this tenant");
  }
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
