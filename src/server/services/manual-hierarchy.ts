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

export const manualSiteAssetSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
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
