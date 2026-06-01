import { AuditAction, CadEntityType, CadFormat, CadScope, CadStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { enqueueCadProcessing } from "../jobs";
import { createUploadUrl, storageKey } from "../storage";
import { createNotification } from "./notifications";

export const cadUploadSchema = z.object({
  projectId: z.string().optional(),
  parentType: z.nativeEnum(CadScope),
  parentId: z.string(),
  format: z.nativeEnum(CadFormat),
  originalName: z.string().min(1),
  contentType: z.string().default("application/octet-stream"),
});

export async function createCadUpload(context: RequestContext, input: z.infer<typeof cadUploadSchema>) {
  await assertCadParentInTenant(context, input);
  const version = await prisma.cadFile.count({
    where: { tenantId: context.tenantId, parentType: input.parentType, parentId: input.parentId },
  });
  const key = storageKey([
    context.tenantId,
    "cad",
    input.parentType.toLowerCase(),
    input.parentId,
    `${Date.now()}-${input.originalName}`,
  ]);

  const cadFile = await prisma.cadFile.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      parentType: input.parentType,
      parentId: input.parentId,
      format: input.format,
      originalName: input.originalName,
      storageKey: key,
      uploadedById: context.userId,
      version: version + 1,
      status: CadStatus.UPLOADED,
    },
  });

  const upload = await createUploadUrl({ key, contentType: input.contentType });
  await writeAuditEvent(context, {
    action: AuditAction.UPLOAD,
    entityType: "CadFile",
    entityId: cadFile.id,
    after: cadFile as unknown as Prisma.InputJsonValue,
  });

  return {
    cadFile,
    upload,
    queue: { queued: false, reason: "waiting_for_file_upload" },
  };
}

export async function getCadStatus(context: RequestContext, id: string) {
  return prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    select: {
      id: true,
      status: true,
      errorMessage: true,
      processingLog: true,
      version: true,
      updatedAt: true,
    },
  });
}

export async function getCadScene(context: RequestContext, id: string) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { layers: true, entities: true },
      },
      reviewIssues: { where: { resolved: false } },
    },
  });

  return {
    cadFile: file,
    scene: file.scenes[0] ?? null,
  };
}

const reviewedEntitySchema = z.object({
  entityId: z.string(),
  type: z.nativeEnum(CadEntityType).optional(),
  label: z.string().optional(),
  status: z.enum(["CONFIRMED", "REJECTED", "SUGGESTED"]).optional(),
});

export const cadReviewSchema = z.object({
  entities: z.array(reviewedEntitySchema).default([]),
  resolvedIssueIds: z.array(z.string()).default([]),
});

export async function reviewCad(context: RequestContext, id: string, input: z.infer<typeof cadReviewSchema>) {
  const file = await prisma.cadFile.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });

  await prisma.$transaction([
    ...input.entities.map((entity) =>
      prisma.cadEntity.updateMany({
        where: { id: entity.entityId, tenantId: context.tenantId },
        data: {
          type: entity.type,
          label: entity.label,
          status: entity.status,
        },
      }),
    ),
    prisma.cadReviewIssue.updateMany({
      where: { id: { in: input.resolvedIssueIds }, tenantId: context.tenantId, cadFileId: id },
      data: { resolved: true },
    }),
  ]);

  await writeAuditEvent(context, {
    action: AuditAction.REVIEW,
    entityType: "CadFile",
    entityId: file.id,
    after: input,
  });

  return getCadScene(context, id);
}

export async function publishCad(context: RequestContext, id: string) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: { scenes: { include: { entities: true }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (file.status === CadStatus.PUBLISHED) throwBadRequest("This CAD version is already published");
  const scene = file.scenes[0];
  if (!scene) throw new Error("CAD scene is not ready for publish");

  const confirmedEntities = scene.entities.filter((entity) => entity.status === "CONFIRMED");

  const result = await prisma.$transaction(async (tx) => {
    const plots = [];
    const assets = [];
    const checklistItems = [];

    for (const entity of confirmedEntities) {
      if (file.parentType === "PLOT") {
        const plot = await tx.plot.findFirstOrThrow({ where: { id: file.parentId, tenantId: context.tenantId } });
        const item = await tx.checklistItem.create({
          data: {
            tenantId: context.tenantId,
            plotId: plot.id,
            parentType: entity.type,
            parentId: entity.id,
            label: entity.label ?? entity.type.replaceAll("_", " "),
            category: checklistCategoryFor(entity.type),
            status: "PENDING",
            progressPct: 0,
          },
        });
        await tx.spatialLink.create({
          data: {
            tenantId: context.tenantId,
            cadEntityId: entity.id,
            recordType: "ChecklistItem",
            recordId: item.id,
            linkConfidence: entity.confidence,
          },
        });
        checklistItems.push(item);
      } else if (file.parentType === "PROJECT" && entity.type === "PLOT" && file.projectId) {
        const plot = await tx.plot.upsert({
          where: {
            tenantId_projectId_code: {
              tenantId: context.tenantId,
              projectId: file.projectId,
              code: entity.label ?? entity.id,
            },
          },
          update: {
            geometry: entity.geometry as Prisma.InputJsonValue,
            areaSqft: readMeasurement(entity.measurements, "areaSqft"),
          },
          create: {
            tenantId: context.tenantId,
            projectId: file.projectId,
            code: entity.label ?? entity.id,
            label: entity.label,
            geometry: entity.geometry as Prisma.InputJsonValue,
            areaSqft: readMeasurement(entity.measurements, "areaSqft"),
          },
        });
        const existingOwnership = await tx.ownershipRecord.findFirst({
          where: { tenantId: context.tenantId, plotId: plot.id },
          select: { id: true },
        });
        if (!existingOwnership) {
          await tx.ownershipRecord.create({
            data: {
              tenantId: context.tenantId,
              plotId: plot.id,
              ownerId: null,
              kind: "COMPANY_INVENTORY",
              amountInr: plot.priceInr,
              sharePct: 100,
              notes: "Company inventory created from CAD publish.",
              createdById: context.userId,
            },
          });
        }
        await tx.spatialLink.create({
          data: {
            tenantId: context.tenantId,
            cadEntityId: entity.id,
            recordType: "Plot",
            recordId: plot.id,
            linkConfidence: entity.confidence,
          },
        });
        plots.push(plot);
      } else if (file.parentType === "PROJECT" && file.projectId) {
        const asset = await tx.siteAsset.create({
          data: {
            tenantId: context.tenantId,
            projectId: file.projectId,
            name: entity.label ?? entity.type,
            type: entity.type,
            geometry: entity.geometry as Prisma.InputJsonValue,
          },
        });
        await tx.spatialLink.create({
          data: {
            tenantId: context.tenantId,
            cadEntityId: entity.id,
            recordType: "SiteAsset",
            recordId: asset.id,
            linkConfidence: entity.confidence,
          },
        });
        assets.push(asset);
      }
    }

    await tx.cadFile.update({ where: { id }, data: { status: CadStatus.PUBLISHED } });
    await tx.cadVersion.create({
      data: {
        tenantId: context.tenantId,
        cadFileId: id,
        version: file.version,
        status: CadStatus.PUBLISHED,
        publishedAt: new Date(),
        comparison: { createdPlots: plots.length, createdSiteAssets: assets.length, createdChecklistItems: checklistItems.length },
      },
    });

    return { plots, assets, checklistItems };
  });

  await writeAuditEvent(context, {
    action: AuditAction.PUBLISH,
    entityType: "CadFile",
    entityId: id,
    after: { plotCount: result.plots.length, assetCount: result.assets.length, checklistItemCount: result.checklistItems.length },
  });
  await createNotification(context, {
    title: "CAD published",
    body: `Published ${result.plots.length} plots, ${result.assets.length} site assets, and ${result.checklistItems.length} plot zones from ${file.originalName}.`,
    data: { cadFileId: id, plotCount: result.plots.length, assetCount: result.assets.length, checklistItemCount: result.checklistItems.length },
  });

  return result;
}

async function assertCadParentInTenant(context: RequestContext, input: z.infer<typeof cadUploadSchema>) {
  if (input.projectId) {
    await prisma.project.findFirstOrThrow({ where: { id: input.projectId, tenantId: context.tenantId } });
  }
  if (input.parentType === "PROJECT") {
    await prisma.project.findFirstOrThrow({ where: { id: input.parentId, tenantId: context.tenantId } });
    return;
  }
  if (input.parentType === "PLOT") {
    await prisma.plot.findFirstOrThrow({ where: { id: input.parentId, tenantId: context.tenantId } });
    return;
  }
  if (input.parentType === "SITE_ASSET") {
    await prisma.siteAsset.findFirstOrThrow({ where: { id: input.parentId, tenantId: context.tenantId } });
  }
}

function checklistCategoryFor(type: CadEntityType) {
  if (type === "BATHROOM" || type === "PLUMBING_LINE") return "Plumbing";
  if (type === "KITCHEN") return "Kitchen";
  if (type === "ELECTRICAL_POINT") return "Electrical";
  if (type === "GARDEN") return "Landscape";
  if (type === "WALL" || type === "STRUCTURE" || type === "STAIRCASE") return "Structure";
  if (type === "FINISHING_ZONE" || type === "DOOR" || type === "WINDOW") return "Finishing";
  return "Construction";
}

export async function getCadVersions(context: RequestContext, id: string) {
  return prisma.cadVersion.findMany({
    where: { tenantId: context.tenantId, cadFileId: id },
    orderBy: { version: "desc" },
  });
}

export async function retryCadProcessing(context: RequestContext, id: string) {
  return startCadProcessing(context, id, true);
}

export async function startCadProcessing(context: RequestContext, id: string, retried = false) {
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });
  if (cadFile.status === CadStatus.PUBLISHED) throwBadRequest("Published CAD versions are immutable and cannot be processed again");

  const updated = await prisma.cadFile.update({
    where: { id },
    data: { status: CadStatus.UPLOADED, errorMessage: null, processingLog: Prisma.JsonNull },
  });
  const queue = await enqueueCadProcessing({ cadFileId: cadFile.id, tenantId: context.tenantId });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "CadFile",
    entityId: id,
    after: { processingQueued: true, retried, queue },
  });
  await createNotification(context, {
    title: retried ? "CAD processing retried" : "CAD processing queued",
    body: `${cadFile.originalName} is queued for CAD extraction.`,
    data: { cadFileId: id, status: updated.status, queue },
  });
  return { cadFile: updated, queue };
}

export async function getCadEntityBusinessLink(context: RequestContext, entityId: string) {
  const entity = await prisma.cadEntity.findFirstOrThrow({
    where: { id: entityId, tenantId: context.tenantId },
    include: {
      scene: { include: { cadFile: true } },
      spatialLinks: { orderBy: { createdAt: "desc" } },
    },
  });
  const link = entity.spatialLinks[0] ?? null;
  if (!link) return { entity, link: null, record: null };

  if (link.recordType === "Plot") {
    const plot = await prisma.plot.findFirst({
      where: { id: link.recordId, tenantId: context.tenantId },
      include: { currentOwner: true, registryRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const documentCount = await prisma.fileAsset.count({ where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: link.recordId } });
    return { entity, link, record: plot ? { ...plot, documentCount } : null };
  }

  if (link.recordType === "SiteAsset") {
    const asset = await prisma.siteAsset.findFirst({
      where: { id: link.recordId, tenantId: context.tenantId },
    });
    return { entity, link, record: asset };
  }

  if (link.recordType === "ChecklistItem") {
    const item = await prisma.checklistItem.findFirst({
      where: { id: link.recordId, tenantId: context.tenantId },
      include: { plot: true },
    });
    return { entity, link, record: item };
  }

  return { entity, link, record: null };
}

function readMeasurement(measurements: Prisma.JsonValue | null, key: string) {
  if (!measurements || typeof measurements !== "object" || Array.isArray(measurements)) return undefined;
  const value = (measurements as Record<string, unknown>)[key];
  if (typeof value !== "number") return undefined;
  return value;
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}
