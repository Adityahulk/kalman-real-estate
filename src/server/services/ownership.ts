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

export async function updateOwner(context: RequestContext, ownerId: string, input: z.infer<typeof ownerSchema>) {
  const before = await prisma.owner.findFirstOrThrow({
    where: { id: ownerId, tenantId: context.tenantId },
  });
  const owner = await prisma.owner.update({
    where: { id: ownerId },
    data: {
      type: input.type,
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      kyc: input.kyc as Prisma.InputJsonValue,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Owner",
    entityId: owner.id,
    before: before as unknown as Prisma.InputJsonValue,
    after: owner as unknown as Prisma.InputJsonValue,
  });
  return owner;
}

export const allotPlotSchema = z.object({
  ownerId: z.string(),
  amountInr: z.number().nonnegative().optional(),
  sharePct: z.number().min(0).max(100).optional(),
  documentId: z.string().optional(),
  effectiveAt: z.string().datetime().optional(),
  paymentMode: z.string().optional(),
  extraDetails: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export async function allotPlot(context: RequestContext, plotId: string, input: z.infer<typeof allotPlotSchema>) {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
    if (before.currentOwnerId) {
      throwBadRequest("This plot already has an owner. Use transfer instead.");
    }
    await tx.owner.findFirstOrThrow({ where: { id: input.ownerId, tenantId: context.tenantId } });
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
        paymentMode: input.paymentMode,
        extraDetails: input.extraDetails as Prisma.InputJsonValue | undefined,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
      },
    });
    return { before, plot, record };
  });
  await writeAuditEvent(context, { action: AuditAction.ALLOT, entityType: "Plot", entityId: plotId, before: result.before as unknown as Prisma.InputJsonValue, after: result.plot as unknown as Prisma.InputJsonValue });
  return result;
}

export async function updateLatestAllotment(context: RequestContext, plotId: string, input: z.infer<typeof allotPlotSchema>) {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
    const recordBefore = await tx.ownershipRecord.findFirst({
      where: { tenantId: context.tenantId, plotId, kind: OwnershipKind.ALLOTMENT },
      orderBy: { createdAt: "desc" },
    });
    if (!recordBefore) {
      throwBadRequest("No allotment record exists for this plot yet.");
    }
    await tx.owner.findFirstOrThrow({ where: { id: input.ownerId, tenantId: context.tenantId } });
    const plot = await tx.plot.update({
      where: { id: plotId },
      data: { currentOwnerId: input.ownerId, status: PlotStatus.ALLOTTED },
    });
    const record = await tx.ownershipRecord.update({
      where: { id: recordBefore.id },
      data: {
        ownerId: input.ownerId,
        amountInr: input.amountInr,
        sharePct: input.sharePct,
        documentId: null,
        notes: input.notes,
        paymentMode: input.paymentMode,
        extraDetails: input.extraDetails as Prisma.InputJsonValue | undefined,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
      },
    });
    return { before, plot, recordBefore, record };
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Plot",
    entityId: plotId,
    before: {
      plot: result.before,
      ownershipRecord: result.recordBefore,
    } as unknown as Prisma.InputJsonValue,
    after: {
      plot: result.plot,
      ownershipRecord: result.record,
    } as unknown as Prisma.InputJsonValue,
  });
  return result;
}

export const transferPlotSchema = z.object({
  buyerOwnerId: z.string(),
  amountInr: z.number().nonnegative().optional(),
  sharePct: z.number().min(0).max(100).optional(),
  documentId: z.string().optional(),
  effectiveAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  extraDetails: z.record(z.unknown()).optional(),
});

export async function transferPlot(context: RequestContext, plotId: string, input: z.infer<typeof transferPlotSchema>) {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: context.tenantId }, select: { maxTransfersPerPlot: true } });
    const transferRecords = await tx.ownershipRecord.findMany({
      where: { tenantId: context.tenantId, plotId, kind: OwnershipKind.TRANSFER, documentId: { not: null } },
      select: { documentId: true },
    });
    const acceptedTransfers = transferRecords.length
      ? await tx.generatedDocument.count({
          where: { tenantId: context.tenantId, id: { in: transferRecords.map((record) => record.documentId).filter(Boolean) as string[] }, status: { in: ["APPROVED", "ISSUED"] } },
        })
      : 0;
    if (acceptedTransfers >= tenant.maxTransfersPerPlot) {
      throwBadRequest(`Transfer limit reached for this plot. Only registry is available now.`);
    }
    await tx.owner.findFirstOrThrow({ where: { id: input.buyerOwnerId, tenantId: context.tenantId } });
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
        sharePct: input.sharePct,
        documentId: input.documentId,
        notes: input.notes,
        extraDetails: input.extraDetails as Prisma.InputJsonValue | undefined,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
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
  await prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
  const result = await prisma.$transaction(async (tx) => {
    const registry = await tx.registryRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        status: input.status,
        registryNo: input.registryNo,
        registryDate: input.registryDate ? new Date(input.registryDate) : undefined,
        notes: input.notes,
      },
    });
    const normalized = input.status.toUpperCase().replaceAll(" ", "_");
    const plot = normalized === "COMPLETED" || normalized === "REGISTERED"
      ? await tx.plot.update({ where: { id: plotId }, data: { status: PlotStatus.REGISTERED } })
      : normalized.includes("PROGRESS") || normalized === "SUBMITTED"
        ? await tx.plot.update({ where: { id: plotId }, data: { status: PlotStatus.REGISTRY_IN_PROGRESS } })
        : null;
    return { registry, plot };
  });
  await writeAuditEvent(context, { action: AuditAction.REGISTRY_UPDATE, entityType: "Plot", entityId: plotId, after: result.registry as unknown as Prisma.InputJsonValue });
  return result.registry;
}

export async function getPlotAudit(context: RequestContext, plotId: string) {
  const [plot, ownership, registry, audit] = await Promise.all([
    prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null }, include: { currentOwner: true } }),
    prisma.ownershipRecord.findMany({ where: { tenantId: context.tenantId, plotId }, include: { owner: true }, orderBy: { effectiveAt: "asc" } }),
    prisma.registryRecord.findMany({ where: { tenantId: context.tenantId, plotId }, orderBy: { createdAt: "asc" } }),
    prisma.auditEvent.findMany({ where: { tenantId: context.tenantId, entityType: "Plot", entityId: plotId }, orderBy: { createdAt: "asc" } }),
  ]);
  return { plot, ownership, registry, audit };
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}
