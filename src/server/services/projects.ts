import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";

export const createProjectSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  address: z.string().optional(),
  whatsappShareText: z.string().optional(),
  budgetInr: z.number().nonnegative().optional(),
  startedAt: z.string().datetime().optional(),
  handoverAt: z.string().datetime().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  address: z.string().optional(),
  whatsappShareText: z.string().optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  budgetInr: z.number().nonnegative().optional(),
  startedAt: z.string().datetime().optional().nullable(),
  handoverAt: z.string().datetime().optional().nullable(),
});

export async function createProject(context: RequestContext, input: z.infer<typeof createProjectSchema>) {
  const project = await prisma.project.create({
    data: {
      tenantId: context.tenantId,
      name: input.name,
      city: input.city,
      address: input.address,
      whatsappShareText: input.whatsappShareText,
      budgetInr: input.budgetInr,
      startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
      handoverAt: input.handoverAt ? new Date(input.handoverAt) : undefined,
    },
  });

  await writeAuditEvent(context, {
    action: AuditAction.CREATE,
    entityType: "Project",
    entityId: project.id,
    after: project as unknown as Prisma.InputJsonValue,
  });

  return project;
}

export async function updateProject(context: RequestContext, projectId: string, input: z.infer<typeof updateProjectSchema>) {
  const before = await prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } });
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      city: input.city,
      address: input.address,
      whatsappShareText: input.whatsappShareText,
      progressPct: input.progressPct,
      budgetInr: input.budgetInr,
      startedAt: input.startedAt === undefined ? undefined : input.startedAt ? new Date(input.startedAt) : null,
      handoverAt: input.handoverAt === undefined ? undefined : input.handoverAt ? new Date(input.handoverAt) : null,
    },
  });

  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Project",
    entityId: project.id,
    before: before as unknown as Prisma.InputJsonValue,
    after: project as unknown as Prisma.InputJsonValue,
  });

  return project;
}

export async function getProjectWorkspace(context: RequestContext, projectId: string) {
  const [plotIds, siteAssetIds, checklistIds] = await Promise.all([
    plotIdsForProject(context.tenantId, projectId),
    siteAssetIdsForProject(context.tenantId, projectId),
    checklistIdsForProject(context.tenantId, projectId),
  ]);

  const [
    project,
    plotStatus,
    latestCad,
    cadStatus,
    pendingRegistry,
    recentTransfers,
    recentAudit,
    assetStatus,
    delayedAssets,
    ownerVisibleUpdates,
    openIssues,
  ] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } }),
    prisma.plot.groupBy({ by: ["status"], where: { tenantId: context.tenantId, projectId }, _count: true }),
    prisma.cadFile.findFirst({
      where: { tenantId: context.tenantId, projectId, parentType: "PROJECT" },
      orderBy: { createdAt: "desc" },
      include: { scenes: { take: 1, orderBy: { createdAt: "desc" } }, reviewIssues: { where: { resolved: false } } },
    }),
    prisma.cadFile.groupBy({ by: ["status"], where: { tenantId: context.tenantId, projectId }, _count: true }),
    prisma.registryRecord.count({
      where: {
        tenantId: context.tenantId,
        plot: { projectId },
        NOT: { status: { in: ["Completed", "COMPLETED", "Registered", "REGISTERED"] } },
      },
    }),
    prisma.ownershipRecord.findMany({
      where: { tenantId: context.tenantId, kind: "TRANSFER", plot: { projectId } },
      include: { plot: true, owner: true },
      orderBy: { effectiveAt: "desc" },
      take: 6,
    }),
    prisma.auditEvent.findMany({
      where: {
        tenantId: context.tenantId,
        OR: [
          { entityType: "Project", entityId: projectId },
          { entityType: "Plot", entityId: { in: plotIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.siteAsset.groupBy({ by: ["status"], where: { tenantId: context.tenantId, projectId }, _count: true }),
    prisma.siteAsset.findMany({
      where: {
        tenantId: context.tenantId,
        projectId,
        deadline: { lt: new Date() },
        status: { notIn: ["COMPLETED", "DONE"] },
      },
      orderBy: { deadline: "asc" },
      take: 6,
    }),
    prisma.progressUpdate.findMany({
      where: {
        tenantId: context.tenantId,
        visibleToOwner: true,
        OR: [
          { parentType: "SiteAsset", parentId: { in: siteAssetIds } },
          { parentType: "ChecklistItem", parentId: { in: checklistIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.issue.findMany({
      where: {
        tenantId: context.tenantId,
        status: "OPEN",
        OR: [
          { parentType: "SiteAsset", parentId: { in: siteAssetIds } },
          { parentType: "Plot", parentId: { in: plotIds } },
          { parentType: "ChecklistItem", parentId: { in: checklistIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const projectFiles = await prisma.fileAsset.findMany({
    where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: { in: plotIds }, deletedAt: null },
    select: { ownerId: true, documentType: true },
  });
  const docPlotIds = new Set(projectFiles.filter((file) => file.documentType).map((file) => file.ownerId));
  const ownedPlots = await prisma.plot.findMany({
    where: { tenantId: context.tenantId, projectId, currentOwnerId: { not: null } },
    select: { id: true },
  });
  const calculatedMissingDocuments = ownedPlots.filter((plot) => !docPlotIds.has(plot.id)).length;

  return {
    project,
    plotStatus,
    latestCad,
    cadStatus,
    pendingRegistry,
    missingDocuments: calculatedMissingDocuments,
    recentTransfers,
    recentAudit,
    assetStatus,
    delayedAssets,
    ownerVisibleUpdates,
    openIssues,
  };
}

export async function getProjectReportCsv(context: RequestContext, projectId: string) {
  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, tenantId: context.tenantId },
  });
  const plots = await prisma.plot.findMany({
    where: { tenantId: context.tenantId, projectId },
    include: {
      currentOwner: true,
      ownershipRecords: {
        include: { owner: true },
        orderBy: { effectiveAt: "asc" },
      },
      registryRecords: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { code: "asc" },
  });
  const documentCounts = await prisma.fileAsset.groupBy({
    by: ["ownerId"],
    where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: { in: plots.map((plot) => plot.id) }, deletedAt: null },
    _count: true,
  });
  const documentCountByPlot = new Map(documentCounts.map((item) => [item.ownerId, item._count]));

  const rows = [
    ["Project", project.name],
    ["City", project.city],
    [],
    ["Plot Number", "Date of Allotment", "Owner Name / Company Status", "Registry Status", "Document Count", "Value INR"],
    ...plots.map((plot) => {
      const allotment = plot.ownershipRecords.find((record) => record.kind === "ALLOTMENT");
      const latestOwnership = [...plot.ownershipRecords].reverse()[0];
      return [
        plot.code,
        allotment?.effectiveAt.toISOString().slice(0, 10) ?? "",
        plot.currentOwner?.name ?? "With Company",
        plot.registryRecords[0]?.status ?? "Not started",
        String(documentCountByPlot.get(plot.id) ?? 0),
        String(Number(latestOwnership?.amountInr ?? plot.priceInr ?? 0)),
      ];
    }),
  ];

  return {
    fileName: `${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "project"}-plot-report.csv`,
    csv: rows.map((row) => row.map(csvCell).join(",")).join("\n"),
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function plotIdsForProject(tenantId: string, projectId: string) {
  const plots = await prisma.plot.findMany({ where: { tenantId, projectId }, select: { id: true } });
  return plots.map((plot) => plot.id);
}

async function siteAssetIdsForProject(tenantId: string, projectId: string) {
  const assets = await prisma.siteAsset.findMany({ where: { tenantId, projectId }, select: { id: true } });
  return assets.map((asset) => asset.id);
}

async function checklistIdsForProject(tenantId: string, projectId: string) {
  const items = await prisma.checklistItem.findMany({
    where: { tenantId, plot: { projectId } },
    select: { id: true },
  });
  return items.map((item) => item.id);
}
