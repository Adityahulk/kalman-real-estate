import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { assertProjectAccess, RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { notifyRoleWithPermission } from "./notifications";

// Government / statutory approval document types the Liaison department maintains.
export const APPROVAL_TYPES = ["RERA", "LDC", "CLU", "NOC", "LICENSE", "AGREEMENT", "GOVT_LETTER"] as const;

export const createApprovalSchema = z.object({
  projectId: z.string().optional(),
  type: z.enum(APPROVAL_TYPES),
  title: z.string().min(2),
  number: z.string().optional(),
  authority: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  fileAssetId: z.string().optional(),
  notes: z.string().optional(),
});

// Uploading a new version of an existing approval. The old row is archived and chained.
export const newVersionSchema = createApprovalSchema.partial().extend({
  fileAssetId: z.string().optional(),
});

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

export async function listApprovals(context: RequestContext, opts?: { includeArchived?: boolean }) {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const approvals = await prisma.approvalDocument.findMany({
    where: {
      tenantId: context.tenantId,
      ...(Array.isArray(context.projectIds) ? { OR: [{ projectId: null }, { projectId: { in: context.projectIds } }] } : {}),
      ...(opts?.includeArchived ? {} : { status: "ACTIVE" }),
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });
  const projectIds = Array.from(new Set(approvals.map((a) => a.projectId).filter((id): id is string => Boolean(id))));
  const projects = projectIds.length
    ? await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name ?? null : null);
  return approvals.map((a) => ({
    ...a,
    projectName: projectName(a.projectId),
    expiryState:
      a.expiresAt == null ? "none" : a.expiresAt < now ? "expired" : a.expiresAt < soon ? "expiring" : "valid",
  }));
}

export async function createApproval(context: RequestContext, input: z.infer<typeof createApprovalSchema>) {
  if (input.projectId) assertProjectAccess(context, input.projectId);
  if (input.fileAssetId) await assertFile(context, input.fileAssetId);
  const created = await prisma.approvalDocument.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId || null,
      type: input.type,
      title: input.title,
      number: input.number || null,
      authority: input.authority || null,
      issuedAt: toDate(input.issuedAt),
      expiresAt: toDate(input.expiresAt),
      fileAssetId: input.fileAssetId || null,
      notes: input.notes || null,
      createdById: context.userId,
      version: 1,
      status: "ACTIVE",
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "ApprovalDocument",
    entityId: created.id,
    after: created as unknown as Prisma.InputJsonValue,
  });
  return created;
}

// Supersede an approval with a newer version: archive the old, create version+1 chained to it.
export async function addApprovalVersion(context: RequestContext, id: string, input: z.infer<typeof newVersionSchema>) {
  const current = await prisma.approvalDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  if (current.projectId) assertProjectAccess(context, current.projectId);
  if (input.projectId) assertProjectAccess(context, input.projectId);
  if (current.status !== "ACTIVE") {
    const error = new Error("This approval has already been superseded.");
    error.name = "BadRequestError";
    throw error;
  }
  if (input.fileAssetId) await assertFile(context, input.fileAssetId);
  const next = await prisma.$transaction(async (tx) => {
    const created = await tx.approvalDocument.create({
      data: {
        tenantId: context.tenantId,
        projectId: input.projectId ?? current.projectId,
        type: input.type ?? current.type,
        title: input.title ?? current.title,
        number: input.number ?? current.number,
        authority: input.authority ?? current.authority,
        issuedAt: input.issuedAt ? toDate(input.issuedAt) : current.issuedAt,
        expiresAt: input.expiresAt ? toDate(input.expiresAt) : current.expiresAt,
        fileAssetId: input.fileAssetId ?? current.fileAssetId,
        notes: input.notes ?? current.notes,
        createdById: context.userId,
        version: current.version + 1,
        status: "ACTIVE",
      },
    });
    await tx.approvalDocument.update({
      where: { id: current.id },
      data: { status: "ARCHIVED", archivedAt: new Date(), supersededById: created.id },
    });
    return created;
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "ApprovalDocument",
    entityId: next.id,
    before: current as unknown as Prisma.InputJsonValue,
    after: next as unknown as Prisma.InputJsonValue,
  });
  await notifyRoleWithPermission(context, "liaison.view", {
    title: `${next.type} updated`,
    body: `${next.title} was updated to version ${next.version}.`,
    data: { approvalId: next.id, type: next.type },
    excludeUserId: context.userId,
  });
  return next;
}

export async function getApprovalHistory(context: RequestContext, id: string) {
  const doc = await prisma.approvalDocument.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  if (doc.projectId) assertProjectAccess(context, doc.projectId);
  // Walk backwards through the supersede chain to assemble the full version history.
  const chain = [doc];
  let cursor = doc;
  while (true) {
    const older = await prisma.approvalDocument.findFirst({ where: { tenantId: context.tenantId, supersededById: cursor.id } });
    if (!older) break;
    chain.push(older);
    cursor = older;
  }
  return chain.sort((a, b) => b.version - a.version);
}

async function assertFile(context: RequestContext, fileAssetId: string) {
  const file = await prisma.fileAsset.findFirst({ where: { id: fileAssetId, tenantId: context.tenantId, deletedAt: null }, select: { id: true } });
  if (!file) {
    const error = new Error("Uploaded file could not be found.");
    error.name = "BadRequestError";
    throw error;
  }
}
