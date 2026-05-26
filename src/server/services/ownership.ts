import { AuditAction, OwnershipKind, PlotStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";

export const ownerSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY", "SHARED"]),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  kyc: z.record(z.unknown()).optional(),
});

export async function createOwner(context: RequestContext, input: z.infer<typeof ownerSchema>) {
  const owner = await prisma.owner.create({
    data: {
      tenantId: context.tenantId,
      type: input.type,
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      kyc: input.kyc as Prisma.InputJsonValue,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "Owner", entityId: owner.id, after: owner as unknown as Prisma.InputJsonValue });
  return owner;
}

export const allotPlotSchema = z.object({
  ownerId: z.string(),
  amountInr: z.number().nonnegative().optional(),
  sharePct: z.number().min(0).max(100).optional(),
  documentId: z.string().optional(),
  notes: z.string().optional(),
});

export async function allotPlot(context: RequestContext, plotId: string, input: z.infer<typeof allotPlotSchema>) {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId } });
    const plot = await tx.plot.update({
      where: { id: plotId },
      data: { currentOwnerId: input.ownerId, status: PlotStatus.ALLOTTED },
    });
    const record = await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        ownerId: input.ownerId,
        kind: OwnershipKind.ALLOTMENT,
        amountInr: input.amountInr,
        sharePct: input.sharePct,
        documentId: input.documentId,
        notes: input.notes,
        createdById: context.userId === "seed-admin" ? undefined : context.userId,
      },
    });
    return { before, plot, record };
  });
  await writeAuditEvent(context, { action: AuditAction.ALLOT, entityType: "Plot", entityId: plotId, before: result.before as unknown as Prisma.InputJsonValue, after: result.plot as unknown as Prisma.InputJsonValue });
  return result;
}

export const transferPlotSchema = z.object({
  buyerOwnerId: z.string(),
  amountInr: z.number().nonnegative().optional(),
  documentId: z.string().optional(),
  notes: z.string().optional(),
});

export async function transferPlot(context: RequestContext, plotId: string, input: z.infer<typeof transferPlotSchema>) {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId } });
    const plot = await tx.plot.update({
      where: { id: plotId },
      data: { currentOwnerId: input.buyerOwnerId, status: PlotStatus.TRANSFERRED },
    });
    const record = await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        ownerId: input.buyerOwnerId,
        kind: OwnershipKind.TRANSFER,
        amountInr: input.amountInr,
        documentId: input.documentId,
        notes: input.notes,
        createdById: context.userId === "seed-admin" ? undefined : context.userId,
      },
    });
    return { before, plot, record };
  });
  await writeAuditEvent(context, { action: AuditAction.TRANSFER, entityType: "Plot", entityId: plotId, before: result.before as unknown as Prisma.InputJsonValue, after: result.plot as unknown as Prisma.InputJsonValue });
  return result;
}

export const registrySchema = z.object({
  status: z.string().min(2),
  registryNo: z.string().optional(),
  registryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function updateRegistry(context: RequestContext, plotId: string, input: z.infer<typeof registrySchema>) {
  const registry = await prisma.registryRecord.create({
    data: {
      tenantId: context.tenantId,
      plotId,
      status: input.status,
      registryNo: input.registryNo,
      registryDate: input.registryDate ? new Date(input.registryDate) : undefined,
      notes: input.notes,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.REGISTRY_UPDATE, entityType: "Plot", entityId: plotId, after: registry as unknown as Prisma.InputJsonValue });
  return registry;
}

export async function getPlotAudit(context: RequestContext, plotId: string) {
  const [plot, ownership, registry, audit] = await Promise.all([
    prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId }, include: { currentOwner: true } }),
    prisma.ownershipRecord.findMany({ where: { tenantId: context.tenantId, plotId }, include: { owner: true }, orderBy: { effectiveAt: "asc" } }),
    prisma.registryRecord.findMany({ where: { tenantId: context.tenantId, plotId }, orderBy: { createdAt: "asc" } }),
    prisma.auditEvent.findMany({ where: { tenantId: context.tenantId, entityType: "Plot", entityId: plotId }, orderBy: { createdAt: "asc" } }),
  ]);
  return { plot, ownership, registry, audit };
}
