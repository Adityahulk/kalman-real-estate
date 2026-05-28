import { AuditAction, MarketingTaskStatus } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { createNotification } from "./notifications";

export const marketingTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(2),
  brief: z.string().min(2),
  dueAt: z.string().datetime().optional(),
  videographerId: z.string().optional(),
  editorId: z.string().optional(),
});

export async function createMarketingTask(context: RequestContext, input: z.infer<typeof marketingTaskSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: input.projectId, tenantId: context.tenantId } });
  const task = await prisma.marketingTask.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      title: input.title,
      brief: input.brief,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      videographerId: input.videographerId,
      editorId: input.editorId,
      createdById: context.userId,
      status: input.videographerId ? MarketingTaskStatus.SHOOT_ASSIGNED : MarketingTaskStatus.TODO,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "MarketingTask", entityId: task.id, after: task });
  await createNotification(context, {
    title: "Marketing task created",
    body: task.title,
    data: { taskId: task.id, projectId: task.projectId },
  });
  return task;
}

export const mediaSchema = z.object({
  fileAssetId: z.string(),
  kind: z.enum(["RAW", "DRAFT", "FINAL"]),
});

export async function addMarketingMedia(context: RequestContext, taskId: string, input: z.infer<typeof mediaSchema>) {
  await prisma.marketingTask.findFirstOrThrow({ where: { id: taskId, tenantId: context.tenantId } });
  await prisma.fileAsset.findFirstOrThrow({ where: { id: input.fileAssetId, tenantId: context.tenantId } });
  const version = await prisma.mediaAsset.count({ where: { tenantId: context.tenantId, taskId, kind: input.kind } });
  const media = await prisma.mediaAsset.create({
    data: {
      tenantId: context.tenantId,
      taskId,
      fileAssetId: input.fileAssetId,
      kind: input.kind,
      version: version + 1,
      uploadedById: context.userId,
    },
  });
  await prisma.marketingTask.update({
    where: { id: taskId },
    data: { status: input.kind === "RAW" ? "RAW_UPLOADED" : "DRAFT_UPLOADED" },
  });
  await writeAuditEvent(context, { action: AuditAction.UPLOAD, entityType: "MarketingTask", entityId: taskId, after: media });
  await createNotification(context, {
    title: `${input.kind} media uploaded`,
    body: `Media version ${media.version} is attached to the marketing task.`,
    data: { taskId, mediaAssetId: media.id },
  });
  return media;
}

export const commentSchema = z.object({
  body: z.string().min(1),
  timecode: z.string().optional(),
});

export async function addMarketingComment(context: RequestContext, taskId: string, input: z.infer<typeof commentSchema>) {
  await prisma.marketingTask.findFirstOrThrow({ where: { id: taskId, tenantId: context.tenantId } });
  const comment = await prisma.reviewComment.create({
    data: {
      tenantId: context.tenantId,
      taskId,
      body: input.body,
      timecode: input.timecode,
      createdById: context.userId,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "ReviewComment", entityId: comment.id, after: comment });
  return comment;
}

export const marketingApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  notes: z.string().optional(),
});

export async function approveMarketingTask(context: RequestContext, taskId: string, input: z.infer<typeof marketingApprovalSchema>) {
  await prisma.marketingTask.findFirstOrThrow({ where: { id: taskId, tenantId: context.tenantId } });
  const task = await prisma.marketingTask.update({
    where: { id: taskId },
    data: { status: input.status === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED" },
  });
  await prisma.approval.create({
    data: {
      tenantId: context.tenantId,
      recordType: "MarketingTask",
      recordId: taskId,
      status: input.status,
      notes: input.notes,
      decidedById: context.userId,
      decidedAt: new Date(),
    },
  });
  await writeAuditEvent(context, { action: input.status === "APPROVED" ? AuditAction.APPROVE : AuditAction.REJECT, entityType: "MarketingTask", entityId: taskId, after: task });
  return task;
}

export async function rejectMarketingTask(context: RequestContext, taskId: string, input: z.infer<typeof marketingApprovalSchema>) {
  return approveMarketingTask(context, taskId, { ...input, status: "REJECTED" });
}
