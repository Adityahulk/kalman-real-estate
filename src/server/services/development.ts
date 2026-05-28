import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { createNotification } from "./notifications";

export const progressSchema = z.object({
  progressPct: z.number().min(0).max(100),
  summary: z.string().min(1),
  photoFileIds: z.array(z.string()).optional(),
  visibleToOwner: z.boolean().default(false),
});

export async function updateSiteAssetProgress(context: RequestContext, siteAssetId: string, input: z.infer<typeof progressSchema>) {
  await prisma.siteAsset.findFirstOrThrow({ where: { id: siteAssetId, tenantId: context.tenantId } });
  if (input.photoFileIds?.length) await assertFilesInTenant(context, input.photoFileIds);
  const [asset, update] = await prisma.$transaction([
    prisma.siteAsset.update({ where: { id: siteAssetId }, data: { progressPct: input.progressPct, status: input.progressPct >= 100 ? "COMPLETED" : "IN_PROGRESS" } }),
    prisma.progressUpdate.create({
      data: {
        tenantId: context.tenantId,
        parentType: "SiteAsset",
        parentId: siteAssetId,
        progressPct: input.progressPct,
        summary: input.summary,
        photoFileIds: input.photoFileIds as Prisma.InputJsonValue,
        visibleToOwner: input.visibleToOwner,
        createdById: context.userId,
      },
    }),
  ]);
  await writeAuditEvent(context, { action: AuditAction.PROGRESS_UPDATE, entityType: "SiteAsset", entityId: siteAssetId, after: update });
  await createNotification(context, {
    title: "Site progress updated",
    body: `${asset.name} is now ${input.progressPct}% complete.`,
    data: { siteAssetId, progressUpdateId: update.id },
  });
  return { asset, update };
}

export async function updateChecklistProgress(context: RequestContext, checklistItemId: string, input: z.infer<typeof progressSchema>) {
  await prisma.checklistItem.findFirstOrThrow({ where: { id: checklistItemId, tenantId: context.tenantId } });
  if (input.photoFileIds?.length) await assertFilesInTenant(context, input.photoFileIds);
  const [item, update] = await prisma.$transaction([
    prisma.checklistItem.update({
      where: { id: checklistItemId },
      data: { progressPct: input.progressPct, status: input.progressPct >= 100 ? "DONE" : "IN_PROGRESS", completedAt: input.progressPct >= 100 ? new Date() : undefined },
    }),
    prisma.progressUpdate.create({
      data: {
        tenantId: context.tenantId,
        parentType: "ChecklistItem",
        parentId: checklistItemId,
        progressPct: input.progressPct,
        summary: input.summary,
        photoFileIds: input.photoFileIds as Prisma.InputJsonValue,
        visibleToOwner: input.visibleToOwner,
        createdById: context.userId,
      },
    }),
  ]);
  await writeAuditEvent(context, { action: AuditAction.PROGRESS_UPDATE, entityType: "ChecklistItem", entityId: checklistItemId, after: update });
  await createNotification(context, {
    title: "Plot checklist updated",
    body: `${item.label} is now ${input.progressPct}% complete.`,
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

async function assertFilesInTenant(context: RequestContext, fileAssetIds: string[]) {
  const files = await prisma.fileAsset.findMany({
    where: { id: { in: fileAssetIds }, tenantId: context.tenantId },
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
    await prisma.plot.findFirstOrThrow({ where: { id: parentId, tenantId: context.tenantId } });
    return;
  }
  if (parentType === "SiteAsset") {
    await prisma.siteAsset.findFirstOrThrow({ where: { id: parentId, tenantId: context.tenantId } });
    return;
  }
  if (parentType === "ChecklistItem") {
    await prisma.checklistItem.findFirstOrThrow({ where: { id: parentId, tenantId: context.tenantId } });
    return;
  }
  throw new Error("Unsupported issue parent type");
}
