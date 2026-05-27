import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { RequestContext } from "../api";

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
  return prisma.notification.create({
    data: {
      tenantId: context.tenantId,
      userId: input.userId,
      channel: input.channel ?? "in_app",
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue,
    },
  });
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
