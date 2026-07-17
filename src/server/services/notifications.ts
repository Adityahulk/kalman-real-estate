import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { RequestContext } from "../api";
import { hasPermission, Permission } from "../rbac";
import { sendPushToUsers } from "./push";

export const notificationSchema = z.object({
  userId: z.string().optional(),
  channel: z.string().default("in_app"),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

export async function createNotification(
  context: Pick<RequestContext, "tenantId">,
  input: Omit<z.infer<typeof notificationSchema>, "channel"> & { channel?: string },
) {
  const notification = await prisma.notification.create({
    data: {
      tenantId: context.tenantId,
      userId: input.userId,
      channel: input.channel ?? "in_app",
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue,
    },
  });
  // Mirror to push (best-effort; sendPushToUsers never throws). A null userId is a tenant-wide
  // broadcast which we don't push here — only targeted notifications reach a device.
  if (input.userId) {
    void sendPushToUsers(context.tenantId, [input.userId], {
      title: input.title,
      body: input.body,
      data: input.data,
    });
  }
  return notification;
}

// Fan a notification out to every active user in the tenant whose role grants `permission`.
// Used to alert "the approvers", "the signatories", etc. without hard-coding role names —
// the recipient set follows the RBAC map, so adding a role to a permission auto-subscribes it.
// `excludeUserId` avoids notifying the actor who just performed the action.
export async function notifyRoleWithPermission(
  context: Pick<RequestContext, "tenantId">,
  permission: Permission,
  input: { title: string; body: string; data?: Record<string, unknown>; excludeUserId?: string },
) {
  const users = await prisma.user.findMany({
    where: { tenantId: context.tenantId, status: "ACTIVE" },
    select: { id: true, role: true },
  });
  const recipients = users.filter(
    (user) => user.id !== input.excludeUserId && hasPermission(user.role, permission),
  );
  if (!recipients.length) return { count: 0 };

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      tenantId: context.tenantId,
      userId: user.id,
      channel: "in_app",
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
    })),
  });
  void sendPushToUsers(
    context.tenantId,
    recipients.map((user) => user.id),
    { title: input.title, body: input.body, data: input.data },
  );
  return { count: recipients.length };
}

export async function listNotifications(context: RequestContext) {
  return prisma.notification.findMany({
    where: {
      tenantId: context.tenantId,
      OR: [{ userId: context.userId }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(context: RequestContext, id: string) {
  return prisma.notification.updateMany({
    where: {
      id,
      tenantId: context.tenantId,
      OR: [{ userId: context.userId }, { userId: null }],
    },
    data: { status: "READ", sentAt: new Date() },
  });
}
