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
      uploadedById: context.userId === "seed-admin" ? undefined : context.userId,
      version: version + 1,
      status: CadStatus.UPLOADED,
    },
  });

  const upload = await createUploadUrl({ key, contentType: input.contentType });
  const queue = await enqueueCadProcessing({ cadFileId: cadFile.id, tenantId: context.tenantId });
  await createNotification(context, {
    title: "CAD upload received",
    body: `${cadFile.originalName} is queued for CAD extraction.`,
    data: { cadFileId: cadFile.id, status: cadFile.status },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPLOAD,
    entityType: "CadFile",
    entityId: cadFile.id,
    after: cadFile as unknown as Prisma.InputJsonValue,
  });

  return { cadFile, upload, queue };
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
  const scene = file.scenes[0];
  if (!scene) throw new Error("CAD scene is not ready for publish");

  const confirmedEntities = scene.entities.filter((entity) => entity.status === "CONFIRMED");

  const result = await prisma.$transaction(async (tx) => {
    const plots = [];
    const assets = [];

    for (const entity of confirmedEntities) {
      if (entity.type === "PLOT" && file.projectId) {
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
      } else if (file.projectId) {
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
        comparison: { createdPlots: plots.length, createdSiteAssets: assets.length },
      },
    });

    return { plots, assets };
  });

  await writeAuditEvent(context, {
    action: AuditAction.PUBLISH,
    entityType: "CadFile",
    entityId: id,
    after: { plotCount: result.plots.length, assetCount: result.assets.length },
  });
  await createNotification(context, {
    title: "CAD published",
    body: `Published ${result.plots.length} plots and ${result.assets.length} site assets from ${file.originalName}.`,
    data: { cadFileId: id, plotCount: result.plots.length, assetCount: result.assets.length },
  });

  return result;
}

export async function getCadVersions(context: RequestContext, id: string) {
  return prisma.cadVersion.findMany({
    where: { tenantId: context.tenantId, cadFileId: id },
    orderBy: { version: "desc" },
  });
}

export async function retryCadProcessing(context: RequestContext, id: string) {
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });

  const updated = await prisma.cadFile.update({
    where: { id },
    data: { status: CadStatus.UPLOADED, errorMessage: null, processingLog: Prisma.JsonNull },
  });
  const queue = await enqueueCadProcessing({ cadFileId: cadFile.id, tenantId: context.tenantId });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "CadFile",
    entityId: id,
    after: { retried: true, queue },
  });
  return { cadFile: updated, queue };
}

function readMeasurement(measurements: Prisma.JsonValue | null, key: string) {
  if (!measurements || typeof measurements !== "object" || Array.isArray(measurements)) return undefined;
  const value = (measurements as Record<string, unknown>)[key];
  if (typeof value !== "number") return undefined;
  return value;
}
