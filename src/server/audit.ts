import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { RequestContext } from "./api";

export async function writeAuditEvent(
  context: RequestContext,
  input: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  return prisma.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });
}

export async function deleteAuditEvent(context: RequestContext, id: string) {
  await prisma.auditEvent.deleteMany({ where: { id, tenantId: context.tenantId } });
  return { id };
}
