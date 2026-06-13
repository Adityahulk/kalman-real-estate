import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import type { RequestContext } from "@/server/api";
import { writeAuditEvent } from "@/server/audit";
import { prisma } from "@/server/db";

export const cadOverlaySchema = z.object({
  kind: z.enum(["VIEW_STATE", "ANNOTATION", "MEASUREMENT", "NOTE"]),
  label: z.string().trim().max(240).optional(),
  sourceHandle: z.string().trim().max(160).optional(),
  geometry: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export async function listCadOverlays(context: RequestContext, cadFileId: string) {
  await assertCadFile(context, cadFileId);
  return prisma.cadOverlay.findMany({
    where: { tenantId: context.tenantId, cadFileId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveCadOverlay(
  context: RequestContext,
  cadFileId: string,
  input: z.infer<typeof cadOverlaySchema>,
) {
  await assertCadFile(context, cadFileId);
  const metadata = input.metadata as Prisma.InputJsonValue | undefined;
  const geometry = input.geometry as Prisma.InputJsonValue | undefined;
  const existing = input.kind === "VIEW_STATE"
    ? await prisma.cadOverlay.findFirst({
        where: {
          tenantId: context.tenantId,
          cadFileId,
          kind: "VIEW_STATE",
          createdById: context.userId,
        },
      })
    : null;
  const overlay = existing
    ? await prisma.cadOverlay.update({
        where: { id: existing.id },
        data: {
          label: input.label,
          sourceHandle: input.sourceHandle,
          geometry: geometry ?? Prisma.JsonNull,
          metadata: metadata ?? Prisma.JsonNull,
        },
      })
    : await prisma.cadOverlay.create({
        data: {
          tenantId: context.tenantId,
          cadFileId,
          kind: input.kind,
          label: input.label,
          sourceHandle: input.sourceHandle,
          geometry: geometry ?? Prisma.JsonNull,
          metadata: metadata ?? Prisma.JsonNull,
          createdById: context.userId,
        },
      });
  await writeAuditEvent(context, {
    action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
    entityType: "CadOverlay",
    entityId: overlay.id,
    after: {
      cadFileId,
      kind: overlay.kind,
      label: overlay.label,
      sourceHandle: overlay.sourceHandle,
    },
  });
  return overlay;
}

async function assertCadFile(context: RequestContext, cadFileId: string) {
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: cadFileId, tenantId: context.tenantId },
    select: { id: true },
  });
  if (!cadFile) {
    const error = new Error("CAD file not found");
    error.name = "NotFoundError";
    throw error;
  }
}
