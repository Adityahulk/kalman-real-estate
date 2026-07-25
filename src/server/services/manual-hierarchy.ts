import { AuditAction, PlotStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";

export const manualPlotSchema = z.object({
  code: z.string().min(1),
  areaSqYards: z.number().nonnegative().optional(),
  primeLocation: z.string().optional(),
  allottedBy: z.string().optional(),
  dimensions: z.string().optional(),
  boundaries: z.object({
    north: z.string().optional(),
    northDimension: z.string().optional(),
    south: z.string().optional(),
    southDimension: z.string().optional(),
    east: z.string().optional(),
    eastDimension: z.string().optional(),
    west: z.string().optional(),
    westDimension: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export async function createManualPlot(context: RequestContext, projectId: string, input: z.infer<typeof manualPlotSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } });
  const result = await prisma.$transaction(async (tx) => {
    await releaseArchivedPlotCodes(tx, context.tenantId, projectId, input.code);
    const plot = await tx.plot.create({
      data: {
        tenantId: context.tenantId,
        projectId,
        code: input.code,
        areaSqYards: input.areaSqYards,
        areaSqft: input.areaSqYards ? input.areaSqYards * 9 : undefined,
        primeLocation: input.primeLocation,
        allottedBy: input.allottedBy,
        dimensions: input.dimensions,
        boundaries: input.boundaries,
        status: PlotStatus.COMPANY_OWNED,
      },
    });
    const ownership = await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId: plot.id,
        ownerId: null,
        kind: "COMPANY_INVENTORY",
        sharePct: 100,
        notes: input.notes ?? "Manual non-Map plot inventory created.",
        createdById: context.userId,
      },
    });
    return { plot, ownership };
  });

  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "Plot",
    entityId: result.plot.id,
    after: {
      source: "MANUAL",
      plot: result.plot,
      initialOwnershipRecordId: result.ownership.id,
    } as unknown as Prisma.InputJsonValue,
  });

  return result;
}

export async function updateManualPlot(context: RequestContext, plotId: string, input: z.infer<typeof manualPlotSchema>) {
  const before = await prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
  const plot = await prisma.plot.update({
    where: { id: plotId },
    data: {
      code: input.code,
      areaSqYards: input.areaSqYards,
      areaSqft: input.areaSqYards ? input.areaSqYards * 9 : null,
      primeLocation: input.primeLocation,
      allottedBy: input.allottedBy,
      dimensions: input.dimensions,
      boundaries: input.boundaries,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Plot",
    entityId: plot.id,
    before: before as unknown as Prisma.InputJsonValue,
    after: plot as unknown as Prisma.InputJsonValue,
  });
  return plot;
}

export async function archiveManualPlot(context: RequestContext, plotId: string) {
  const before = await prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
  const result = await prisma.$transaction(async (tx) => {
    const generatedDocuments = await tx.generatedDocument.findMany({
      where: { tenantId: context.tenantId, recordType: "Plot", recordId: plotId, archivedAt: null },
      select: { id: true, fileAssetId: true },
    });
    const generatedDocumentIds = generatedDocuments.map((document) => document.id);
    const generatedFileIds = generatedDocuments.map((document) => document.fileAssetId).filter((id): id is string => Boolean(id));

    const now = new Date();
    if (generatedDocumentIds.length) {
      await tx.generatedDocument.updateMany({
        where: { tenantId: context.tenantId, id: { in: generatedDocumentIds }, archivedAt: null },
        data: { archivedAt: now, archivedById: context.userId, archiveReason: `Plot ${before.code} archived` },
      });
    }
    await tx.fileAsset.updateMany({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        OR: [
          { ownerType: "Plot", ownerId: plotId },
          ...(generatedFileIds.length ? [{ id: { in: generatedFileIds } }] : []),
        ],
      },
      data: {
        deletedAt: now,
        deletedById: context.userId,
        deleteReason: `Plot ${before.code} deleted.`,
      },
    });
    await tx.ownershipRecord.updateMany({
      where: { tenantId: context.tenantId, plotId, cancelledAt: null },
      data: { cancelledAt: now, cancelledById: context.userId, cancellationReason: `Plot ${before.code} archived` },
    });
    await tx.registryRecord.updateMany({
      where: { tenantId: context.tenantId, plotId, archivedAt: null },
      data: { archivedAt: now, archivedById: context.userId, archiveReason: `Plot ${before.code} archived` },
    });
    const plot = await tx.plot.update({
      where: { id: plotId },
      data: {
        code: deletedPlotCode(before.code, before.id),
        archivedAt: now,
        archiveReason: "Deleted from ownership module.",
        currentOwnerId: null,
        status: PlotStatus.COMPANY_OWNED,
      },
    });
    return { plot, generatedDocumentCount: generatedDocumentIds.length, generatedFileCount: generatedFileIds.length };
  });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "Plot",
    entityId: result.plot.id,
    before: before as unknown as Prisma.InputJsonValue,
    after: result as unknown as Prisma.InputJsonValue,
  });
  return result.plot;
}

export async function restoreManualPlot(context: RequestContext, plotId: string) {
  const before = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, tenantId: context.tenantId, archivedAt: { not: null } },
  });
  const originalCode = before.code.split("__deleted__")[0] || before.code;
  const conflict = await prisma.plot.findFirst({
    where: {
      tenantId: context.tenantId,
      projectId: before.projectId,
      code: originalCode,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (conflict) {
    const error = new Error(`Plot ${originalCode} is already active. Rename or archive it before restoring this record.`);
    error.name = "BadRequestError";
    throw error;
  }
  const plot = await prisma.plot.update({
    where: { id: plotId },
    data: {
      code: originalCode,
      archivedAt: null,
      archiveReason: null,
      currentOwnerId: null,
      status: PlotStatus.COMPANY_OWNED,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Plot",
    entityId: plotId,
    before: before as unknown as Prisma.InputJsonValue,
    after: { restored: true, plot } as unknown as Prisma.InputJsonValue,
  });
  return plot;
}

async function releaseArchivedPlotCodes(
  tx: Prisma.TransactionClient,
  tenantId: string,
  projectId: string,
  code: string,
) {
  const archivedPlots = await tx.plot.findMany({
    where: { tenantId, projectId, code, archivedAt: { not: null } },
    select: { id: true, code: true },
  });
  for (const plot of archivedPlots) {
    await tx.plot.update({
      where: { id: plot.id },
      data: { code: deletedPlotCode(plot.code, plot.id) },
    });
  }
}

function deletedPlotCode(code: string, id: string) {
  return `${code}__deleted__${id.slice(-8)}`;
}

export const manualSiteAssetSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  totalArea: z.number().nonnegative().optional(),
  units: z.string().min(1).optional(),
  status: z.string().default("PLANNED"),
  progressPct: z.number().min(0).max(100).default(0),
  deadline: z.string().datetime().optional(),
  contractorId: z.string().optional(),
});

export async function createManualSiteAsset(context: RequestContext, projectId: string, input: z.infer<typeof manualSiteAssetSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } });
  const asset = await prisma.siteAsset.create({
    data: {
      tenantId: context.tenantId,
      projectId,
      name: input.name,
      type: input.type,
      totalArea: input.totalArea,
      units: input.units,
      status: input.status,
      progressPct: input.progressPct,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      contractorId: input.contractorId,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "SiteAsset",
    entityId: asset.id,
    after: { source: "MANUAL", asset } as unknown as Prisma.InputJsonValue,
  });
  return asset;
}

export const manualPlotZoneSchema = z.object({
  label: z.string().min(2),
  category: z.string().min(2),
  parentType: z.string().default("ManualZone"),
  progressPct: z.number().min(0).max(100).default(0),
  status: z.string().default("PENDING"),
  dueAt: z.string().datetime().optional(),
});

export async function createManualPlotZone(context: RequestContext, plotId: string, input: z.infer<typeof manualPlotZoneSchema>) {
  const plot = await prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
  const item = await prisma.checklistItem.create({
    data: {
      tenantId: context.tenantId,
      plotId: plot.id,
      parentType: input.parentType,
      parentId: plot.id,
      label: input.label,
      category: input.category,
      progressPct: input.progressPct,
      status: input.status,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "ChecklistItem",
    entityId: item.id,
    after: { source: "MANUAL", plotId, item } as unknown as Prisma.InputJsonValue,
  });
  return item;
}
