import { AuditAction, CadEntityType, CadFormat, CadScope, CadStatus, FileStorageProvider, InsightSeverity, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { scheduleCadPdfProcessing } from "./cad-pdf-processing";
import { createUploadTargets, getObjectResilient, putObjectResilient, storageKey } from "../storage";
import { createNotification } from "./notifications";
import { inspectPdf, extractPdf, type CadExtractionResult } from "./cad-pdf";
import { geminiAvailable } from "./gemini-vision";

export const cadUploadSchema = z.object({
  projectId: z.string().optional(),
  parentType: z.nativeEnum(CadScope),
  parentId: z.string(),
  format: z.nativeEnum(CadFormat),
  originalName: z.string().min(1),
  contentType: z.string().default("application/octet-stream"),
});

export const cadUploadCompleteSchema = z.object({
  storageProvider: z.nativeEnum(FileStorageProvider),
  storageKey: z.string().min(1),
});

export const deleteCadSchema = z.object({
  reason: z.string().optional(),
});

type StoredCadUpload = z.infer<typeof cadUploadSchema> & {
  bytes: Buffer;
};

const SYNC_TIMEOUT_MS = Number(process.env.CAD_SYNC_TIMEOUT_MS ?? 25_000);

async function trySyncInspect(format: CadFormat, bytes: Buffer, originalName: string): Promise<CadExtractionResult | null> {
  if (format !== CadFormat.VECTOR_PDF || !geminiAvailable()) return null;
  try {
    const result = await Promise.race([
      inspectPdf(bytes, originalName),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SYNC_TIMEOUT_MS)),
    ]);
    return result;
  } catch {
    return null;
  }
}

async function trySyncExtract(format: CadFormat, bytes: Buffer, originalName: string, analysis: Record<string, unknown>): Promise<CadExtractionResult | null> {
  if (format !== CadFormat.VECTOR_PDF || !geminiAvailable()) return null;
  try {
    const result = await Promise.race([
      extractPdf(bytes, originalName, analysis),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SYNC_TIMEOUT_MS)),
    ]);
    return result;
  } catch {
    return null;
  }
}

export async function persistSyncInspect(
  tenantId: string,
  cadFileId: string,
  result: CadExtractionResult,
) {
  const analysis = result.analysis ?? {};
  const analysisData = {
    discipline: String(analysis.discipline ?? "AUTO"),
    sourceKind: typeof analysis.sourceKind === "string" ? analysis.sourceKind : undefined,
    pageNumber: typeof analysis.pageNumber === "number" ? analysis.pageNumber : 1,
    proposedRegion: analysis.proposedRegion as Prisma.InputJsonValue | undefined,
    excludedRegions: analysis.excludedRegions as Prisma.InputJsonValue | undefined,
    expectedCounts: analysis.expectedCounts as Prisma.InputJsonValue | undefined,
    inspection: analysis.inspection as Prisma.InputJsonValue | undefined,
    scaleCalibration: analysis.scaleCalibration as Prisma.InputJsonValue | undefined,
    calibrationConfirmedAt: analysis.calibrationConfirmed === true ? new Date() : undefined,
    previewArtifactKey: undefined as string | undefined,
    rawArtifactKey: "",
  };
  const rawKey = storageKey([tenantId, "cad", cadFileId, "artifacts", `${Date.now()}-inspect.json`]);
  const stored = await putObjectResilient(rawKey, Buffer.from(JSON.stringify(result)), "application/json", { mirrorLocalOnS3Success: true });
  analysisData.rawArtifactKey = stored.storageKey;

  await prisma.$transaction([
    prisma.cadAnalysis.upsert({
      where: { cadFileId },
      update: analysisData,
      create: { tenantId, cadFileId, ...analysisData },
    }),
    prisma.cadFile.update({
      where: { id: cadFileId },
      data: {
        status: CadStatus.SETUP_REQUIRED,
        processingLog: {
          mode: "inspect",
          inspectedAt: new Date().toISOString(),
          sourceKind: analysisData.sourceKind,
          discipline: analysisData.discipline,
          syncProcessed: true,
        },
      },
    }),
  ]);
}

export async function persistCadExtractionResult(
  tenantId: string,
  cadFileId: string,
  result: CadExtractionResult,
  analysisRecord: Prisma.CadAnalysisGetPayload<Record<string, never>>,
  source = "server-extraction",
) {
  const rawEntities = result.entities;
  if (!rawEntities.length) throw new Error("No candidates extracted.");

  const xs: number[] = [];
  const ys: number[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number") {
        xs.push(value[0]);
        ys.push(value[1]);
      } else value.forEach(visit);
    } else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  rawEntities.forEach((e) => visit(e.geometry));
  if (!xs.length || !ys.length) throw new Error("No usable coordinates");
  const bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };

  const rawKey = storageKey([tenantId, "cad", cadFileId, "artifacts", `${Date.now()}-extract.json`]);
  await putObjectResilient(rawKey, Buffer.from(JSON.stringify(result)), "application/json", { mirrorLocalOnS3Success: true });

  await prisma.$transaction(async (tx) => {
    await tx.cadAnalysis.update({
      where: { cadFileId },
      data: { rawArtifactKey: rawKey },
    });

    const oldScenes = await tx.cadScene.findMany({
      where: { tenantId, cadFileId },
      select: { id: true, entities: { select: { id: true } } },
    });
    const oldEntityIds = oldScenes.flatMap((s) => s.entities.map((e) => e.id));
    if (oldEntityIds.length) {
      await tx.spatialLink.deleteMany({ where: { tenantId, cadEntityId: { in: oldEntityIds } } });
      await tx.cadEntity.deleteMany({ where: { tenantId, id: { in: oldEntityIds } } });
    }
    if (oldScenes.length) {
      await tx.cadLayer.deleteMany({ where: { tenantId, sceneId: { in: oldScenes.map((s) => s.id) } } });
      await tx.cadScene.deleteMany({ where: { tenantId, id: { in: oldScenes.map((s) => s.id) } } });
    }
    await tx.cadReviewIssue.deleteMany({ where: { tenantId, cadFileId } });

    const cadFile = await tx.cadFile.findUniqueOrThrow({ where: { id: cadFileId } });
    const scene = await tx.cadScene.create({
      data: {
        tenantId,
        cadFileId,
        scope: cadFile.parentType,
        parentId: cadFile.parentId,
        bounds,
        units: "drawing-space",
        sceneJson: { source, entityCount: rawEntities.length, rawArtifactKey: rawKey },
      },
    });

    const layerValues = result.layers.map((l) => typeof l === "string" ? { name: l } : l).filter((l, i, a) => l.name && a.findIndex((v) => v.name === l.name) === i);
    const layers = [];
    for (const layer of layerValues) {
      layers.push(await tx.cadLayer.create({
        data: { tenantId, sceneId: scene.id, name: layer.name, purpose: layer.purpose, color: layer.color, metadata: layer.metadata as Prisma.InputJsonValue | undefined },
      }));
    }
    const layerByName = new Map(layers.map((l) => [l.name, l.id]));

    const created: Array<{ id: string; label: string | null; type: CadEntityType; validation: Prisma.JsonValue | null }> = [];
    for (const entity of rawEntities) {
      const type = Object.values(CadEntityType).includes(entity.type as CadEntityType) ? entity.type as CadEntityType : CadEntityType.UNKNOWN;
      const candidate = await tx.cadEntity.create({
        data: {
          tenantId,
          sceneId: scene.id,
          layerId: entity.layer ? layerByName.get(entity.layer) : undefined,
          type,
          label: (entity.label ?? "").slice(0, 500) || null,
          confidence: Math.min(1, Math.max(0, Number(entity.confidence) || 0.35)),
          geometry: entity.geometry as Prisma.InputJsonValue,
          measurements: entity.measurements as Prisma.InputJsonValue | undefined,
          validation: entity.validation as Prisma.InputJsonValue | undefined,
          sourceHandle: entity.sourceHandle,
          sourceLayer: entity.layer,
          status: "SUGGESTED",
        },
      });
      created.push({ id: candidate.id, label: candidate.label, type, validation: candidate.validation });

      const issues: Array<{ severity: InsightSeverity; code: string; message: string; blocking: boolean }> = [];
      if (type === CadEntityType.PLOT) {
        if (!isValidPlotLabelSync(candidate.label)) {
          issues.push(candidate.label
            ? { severity: InsightSeverity.CRITICAL, code: "INVALID_PLOT_LABEL", message: "Plot number is not a valid unique plot identifier.", blocking: true }
            : { severity: InsightSeverity.CRITICAL, code: "MISSING_PLOT_LABEL", message: "A likely plot boundary was found, but its plot number could not be read.", blocking: true });
        }
        const geo = entity.geometry as Record<string, unknown>;
        if (!(geo.closed === true && Array.isArray(geo.points) && geo.points.length >= 4)) {
          issues.push({ severity: InsightSeverity.CRITICAL, code: "UNCLOSED_PLOT", message: "Plot boundary is not closed.", blocking: true });
        }
      }
      const vCodes = validationBlockingCodesSync(entity.validation as Record<string, unknown> | null);
      for (const code of vCodes) {
        issues.push({ severity: code === "SCALE_REQUIRED" ? InsightSeverity.HIGH : InsightSeverity.MEDIUM, code, message: `Candidate validation: ${code.replaceAll("_", " ").toLowerCase()}.`, blocking: code !== "DUPLICATE_OCR_LABEL" });
      }
      for (const issue of issues) {
        await tx.cadReviewIssue.create({ data: { tenantId, cadFileId, entityId: candidate.id, ...issue } });
      }
    }

    const plotEntities = created.filter((e) => e.type === CadEntityType.PLOT);
    const labels = new Map<string, string[]>();
    for (const e of plotEntities) {
      const label = e.label?.trim().toUpperCase();
      if (!label) continue;
      labels.set(label, [...(labels.get(label) ?? []), e.id]);
    }
    for (const [label, ids] of labels) {
      if (ids.length < 2) continue;
      for (const entityId of ids) {
        await tx.cadReviewIssue.create({ data: { tenantId, cadFileId, entityId, severity: InsightSeverity.CRITICAL, code: "DUPLICATE_PLOT_LABEL", message: `Plot number ${label} appears more than once.`, blocking: true } });
      }
    }
    const expected = typeof analysisRecord.expectedCounts === "object" && analysisRecord.expectedCounts && !Array.isArray(analysisRecord.expectedCounts)
      ? (analysisRecord.expectedCounts as Record<string, unknown>).total : undefined;
    if (typeof expected === "number" && expected !== plotEntities.length) {
      await tx.cadReviewIssue.create({ data: { tenantId, cadFileId, severity: InsightSeverity.CRITICAL, code: "PLOT_COUNT_MISMATCH", message: `The drawing states ${expected} plots, but ${plotEntities.length} candidates were detected.`, blocking: true, metadata: { expected, detected: plotEntities.length } } });
    }

    const blockingCount = await tx.cadReviewIssue.count({ where: { tenantId, cadFileId, blocking: true, resolved: false } });
    const requiresCalibration = plotEntities.length > 0 && !analysisRecord.calibrationConfirmedAt;
    await tx.cadFile.update({
      where: { id: cadFileId },
      data: {
        status: requiresCalibration ? CadStatus.CALIBRATION_REQUIRED : CadStatus.REVIEW_REQUIRED,
        errorMessage: null,
        processingLog: {
          mode: "extract",
          extractedAt: new Date().toISOString(),
          candidateCount: created.length,
          plotCandidateCount: plotEntities.length,
          blockingIssueCount: blockingCount,
          syncProcessed: true,
        },
      },
    });
  }, { timeout: 180_000 });
}

function isValidPlotLabelSync(label: string | null) {
  if (!label || label.startsWith("\\")) return false;
  const normalized = label.trim().toUpperCase();
  if (["PLOT", "PLOTS", "PLOTTING", "PLOT NO.", "PLOT NO"].includes(normalized)) return false;
  return /^(?:EWS-\d+|PARK-[A-Z]?-?\d+|GREEN-\d+|COM-\d+|PARKING-\d+|(?:[A-Z]{0,2}[-/]?)?\d{1,4}[A-Z]?)$/.test(normalized);
}

function validationBlockingCodesSync(value: Record<string, unknown> | null) {
  if (!value) return [];
  const codes = value.blockingCodes;
  return Array.isArray(codes) ? codes.filter((c): c is string => typeof c === "string") : [];
}

export async function createStoredCadUpload(context: RequestContext, input: StoredCadUpload) {
  await assertCadParentInTenant(context, input);
  validateCadBytes(input.bytes, input.format);
  const originalName = safeCadFileName(input.originalName, input.format);
  const key = storageKey([
    context.tenantId,
    "cad",
    input.parentType.toLowerCase(),
    input.parentId,
    `${Date.now()}-${originalName}`,
  ]);
  const stored = await putObjectResilient(key, input.bytes, input.contentType, {
    mirrorLocalOnS3Success: true,
  });
  const version = await prisma.cadFile.count({
    where: { tenantId: context.tenantId, parentType: input.parentType, parentId: input.parentId },
  });
  const cadFile = await prisma.cadFile.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      parentType: input.parentType,
      parentId: input.parentId,
      format: input.format,
      originalName,
      storageKey: stored.storageKey,
      uploadedById: context.userId,
      version: version + 1,
      status: CadStatus.UPLOADED,
      processingLog: {
        storageProvider: stored.storageProvider,
        fallbackStorageKey: stored.fallbackStorageKey,
        storageWarning: stored.warning,
        storedAt: new Date().toISOString(),
      },
    },
  });

  if (input.format === CadFormat.DXF || input.format === CadFormat.DWG) {
    const updated = await prisma.cadFile.update({
      where: { id: cadFile.id },
      data: {
        processingLog: {
          storageProvider: stored.storageProvider,
          fallbackStorageKey: stored.fallbackStorageKey,
          storageWarning: stored.warning,
          storedAt: new Date().toISOString(),
          parserEngine: "mlightcad-browser",
          progressLabel: "Open this drawing to parse it securely in your browser.",
          stage: "WAITING_FOR_BROWSER",
        },
      },
    });
    await writeAuditEvent(context, {
      action: AuditAction.UPLOAD,
      entityType: "CadFile",
      entityId: cadFile.id,
      after: {
        cadFileId: cadFile.id,
        originalName: cadFile.originalName,
        storageKey: cadFile.storageKey,
        storageProvider: stored.storageProvider,
        parserEngine: "mlightcad-browser",
      },
    });
    return {
      cadFile: updated,
      storage: stored,
      queue: { queued: false, reason: "browser_extraction_required" },
    };
  }

  const syncResult = await trySyncInspect(input.format, input.bytes, originalName);
  let queue: { queued: boolean; jobId?: string; reason?: string } = { queued: false, reason: "sync_processed" };
  if (syncResult) {
    await persistSyncInspect(context.tenantId, cadFile.id, syncResult);
    const updated = await prisma.cadFile.findUniqueOrThrow({ where: { id: cadFile.id } });
    await writeAuditEvent(context, {
      action: AuditAction.UPLOAD,
      entityType: "CadFile",
      entityId: cadFile.id,
      after: {
        cadFileId: cadFile.id,
        originalName: cadFile.originalName,
        storageKey: cadFile.storageKey,
        storageProvider: stored.storageProvider,
        syncProcessed: true,
      },
    });
    return { cadFile: updated, storage: stored, queue };
  }

  queue = scheduleCadPdfProcessing({ cadFileId: cadFile.id, tenantId: context.tenantId, mode: "inspect" });
  if (!queue.queued) {
    await prisma.cadFile.update({
      where: { id: cadFile.id },
      data: {
        status: CadStatus.FAILED,
        errorMessage: queue.reason,
      },
    });
  }
  await writeAuditEvent(context, {
    action: AuditAction.UPLOAD,
    entityType: "CadFile",
    entityId: cadFile.id,
    after: {
      cadFileId: cadFile.id,
      originalName: cadFile.originalName,
      storageKey: cadFile.storageKey,
      storageProvider: stored.storageProvider,
      processingScheduled: queue.queued,
    },
  });

  return { cadFile, storage: stored, queue };
}

export async function createCadUpload(context: RequestContext, input: z.infer<typeof cadUploadSchema>) {
  await assertCadParentInTenant(context, input);
  const originalName = safeCadFileName(input.originalName, input.format);
  const version = await prisma.cadFile.count({
    where: { tenantId: context.tenantId, parentType: input.parentType, parentId: input.parentId },
  });
  const key = storageKey([
    context.tenantId,
    "cad",
    input.parentType.toLowerCase(),
    input.parentId,
    `${Date.now()}-${originalName}`,
  ]);

  const upload = await createUploadTargets({ key, contentType: input.contentType });
  const cadFile = await prisma.cadFile.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      parentType: input.parentType,
      parentId: input.parentId,
      format: input.format,
      originalName,
      storageKey: upload.primary.storageKey,
      uploadedById: context.userId,
      version: version + 1,
      status: CadStatus.UPLOADED,
    },
  });

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

function safeCadFileName(name: string, format: CadFormat) {
  const fallback = format === CadFormat.VECTOR_PDF
    ? "plan.pdf"
    : format === CadFormat.DWG
      ? "drawing.dwg"
      : "drawing.dxf";
  const leaf = name.split(/[\\/]/).filter(Boolean).pop() ?? fallback;
  let decoded = leaf;
  try { decoded = decodeURIComponent(leaf); } catch { /* keep original */ }
  const cleaned = decoded.replace(/[^a-zA-Z0-9._ ()-]/g, "-").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return fallback;
  if (!cleaned.toLowerCase().endsWith(".dxf") && !cleaned.toLowerCase().endsWith(".pdf") && !cleaned.toLowerCase().endsWith(".dwg")) return fallback;
  return cleaned;
}

export async function completeCadUpload(context: RequestContext, id: string, input: z.infer<typeof cadUploadCompleteSchema>) {
  const before = await prisma.cadFile.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  const tenantPrefix = `${context.tenantId}/`;
  const localTenantPrefix = `local/${context.tenantId}/`;
  if (!input.storageKey.startsWith(tenantPrefix) && !input.storageKey.startsWith(localTenantPrefix)) {
    const error = new Error("Upload key does not belong to this tenant");
    error.name = "ForbiddenError";
    throw error;
  }
  try {
    await getObjectResilient(input.storageKey);
  } catch {
    throwBadRequest("The Map file was not received by storage. Please upload the file again.");
  }
  const cadFile = await prisma.cadFile.update({
    where: { id },
    data: { storageKey: input.storageKey },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "CadFile",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: { storageKey: cadFile.storageKey, storageProvider: input.storageProvider },
  });
  return cadFile;
}

export async function getCadStatus(context: RequestContext, id: string) {
  const cadFile = await prisma.cadFile.findFirstOrThrow({
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
  const log = jsonRecord(cadFile.processingLog);
  const startedAt = typeof log.startedAt === "string" ? new Date(log.startedAt) : null;
  return {
    ...cadFile,
    stage: typeof log.stage === "string" ? log.stage : null,
    progressLabel: typeof log.progressLabel === "string" ? log.progressLabel : null,
    latestHeartbeat: typeof log.heartbeatAt === "string" ? log.heartbeatAt : null,
    failureCode: typeof log.failureCode === "string" ? log.failureCode : null,
    elapsedMs: startedAt && !Number.isNaN(startedAt.getTime())
      ? Math.max(Number(log.elapsedMs ?? 0), Date.now() - startedAt.getTime())
      : Number(log.elapsedMs ?? 0),
  };
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

const regionObjectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});
const normalizedRegionSchema = regionObjectSchema.refine((value) => value.x + value.width <= 1.0001 && value.y + value.height <= 1.0001, {
  message: "Drawing region must stay inside the source page",
});

export const cadExtractSchema = z.object({
  discipline: z.enum(["AUTO", "SITE_LAYOUT", "ELECTRICAL", "ARCHITECTURAL", "MIXED"]),
  region: normalizedRegionSchema,
  excludedRegions: z.array(regionObjectSchema.extend({ label: z.string().optional() }).refine((value) => value.x + value.width <= 1.0001 && value.y + value.height <= 1.0001)).default([]),
  expectedCounts: z.object({
    total: z.number().int().positive().optional(),
    residential: z.number().int().nonnegative().optional(),
    commercial: z.number().int().nonnegative().optional(),
    ews: z.number().int().nonnegative().optional(),
  }).optional(),
});

export const cadCalibrationSchema = z.object({
  drawingDistance: z.number().positive(),
  knownLengthFeet: z.number().positive(),
  source: z.enum(["MANUAL", "DIMENSION_TEXT", "DXF_UNITS"]).default("MANUAL"),
  notes: z.string().max(500).optional(),
});

export const cadBatchReviewSchema = z.object({
  entityIds: z.array(z.string()).min(1),
  status: z.enum(["CONFIRMED", "REJECTED", "SUGGESTED"]),
  resolvedIssueIds: z.array(z.string()).default([]),
});

export const cadPublishSchema = z.object({
  overrideReason: z.string().trim().min(10).max(1000).optional(),
});

export const cadRollbackSchema = z.object({
  confirm: z.boolean().default(false),
  reason: z.string().trim().min(5).max(1000).optional(),
});

export async function getCadAnalysis(context: RequestContext, id: string) {
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      analysis: true,
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, bounds: true, _count: { select: { entities: true } } },
      },
      reviewIssues: {
        where: { resolved: false },
        orderBy: [{ blocking: "desc" }, { severity: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  return {
    cadFile,
    analysis: cadFile.analysis,
    scene: cadFile.scenes[0] ?? null,
    issueSummary: {
      blocking: cadFile.reviewIssues.filter((issue) => issue.blocking).length,
      warnings: cadFile.reviewIssues.filter((issue) => !issue.blocking).length,
    },
  };
}

export async function getCadCandidates(context: RequestContext, id: string) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      analysis: true,
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          layers: true,
          entities: { orderBy: [{ type: "asc" }, { label: "asc" }] },
        },
      },
      reviewIssues: { where: { resolved: false }, orderBy: [{ blocking: "desc" }, { createdAt: "asc" }] },
    },
  });
  return { cadFile: file, analysis: file.analysis, scene: file.scenes[0] ?? null, issues: file.reviewIssues };
}

export async function startCadExtraction(context: RequestContext, id: string, input: z.infer<typeof cadExtractSchema>) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: { analysis: true },
  });
  if (!file.analysis) throwBadRequest("Map inspection is not ready yet");
  if (file.status === CadStatus.PUBLISHED) throwBadRequest("Published Map versions are immutable");
  await prisma.cadAnalysis.update({
    where: { cadFileId: id },
    data: {
      discipline: input.discipline,
      confirmedRegion: input.region,
      excludedRegions: input.excludedRegions,
      expectedCounts: input.expectedCounts,
      setupConfirmedAt: new Date(),
    },
  });

  const updatedAnalysis = await prisma.cadAnalysis.findUniqueOrThrow({ where: { cadFileId: id } });
  const analysisObj = {
    discipline: updatedAnalysis.discipline,
    sourceKind: updatedAnalysis.sourceKind,
    pageNumber: updatedAnalysis.pageNumber,
    proposedRegion: updatedAnalysis.proposedRegion,
    confirmedRegion: updatedAnalysis.confirmedRegion,
    excludedRegions: updatedAnalysis.excludedRegions,
    expectedCounts: updatedAnalysis.expectedCounts,
    scaleCalibration: updatedAnalysis.scaleCalibration,
    calibrationConfirmedAt: updatedAnalysis.calibrationConfirmedAt,
    inspection: updatedAnalysis.inspection,
  } as Record<string, unknown>;

  let buffer: Buffer;
  try {
    buffer = await getObjectResilient(file.storageKey);
  } catch {
    throwBadRequest("The uploaded Map file is missing from storage.");
  }

  const syncResult = await trySyncExtract(file.format, buffer, file.originalName, analysisObj);
  if (syncResult && syncResult.entities.length > 0) {
    await prisma.cadFile.update({ where: { id }, data: { status: CadStatus.EXTRACTING, errorMessage: null } });
    await persistCadExtractionResult(context.tenantId, id, syncResult, updatedAnalysis, "gemini-pdf");
    await writeAuditEvent(context, {
      action: AuditAction.REVIEW,
      entityType: "CadFile",
      entityId: id,
      after: { drawingSetup: input, syncProcessed: true, candidateCount: syncResult.entities.length },
    });
    return { cadFileId: id, queue: { queued: false, reason: "sync_processed" } };
  }

  await prisma.cadFile.update({ where: { id }, data: { status: CadStatus.EXTRACTING, errorMessage: null } });
  const queue = scheduleCadPdfProcessing({ cadFileId: id, tenantId: context.tenantId, mode: "extract" });
  if (!queue.queued) throwBadRequest(`PDF map processing is unavailable: ${queue.reason}`);
  await writeAuditEvent(context, {
    action: AuditAction.REVIEW,
    entityType: "CadFile",
    entityId: id,
    after: { drawingSetup: input, extractionSchedule: queue },
  });
  return { cadFileId: id, queue };
}

export async function calibrateCad(context: RequestContext, id: string, input: z.infer<typeof cadCalibrationSchema>) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      analysis: true,
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { entities: true },
      },
    },
  });
  if (!file.analysis) throwBadRequest("Map inspection is not ready");
  if (!file.scenes.length) throwBadRequest("Extract candidates before confirming scale");
  const drawingUnitsPerFoot = input.drawingDistance / input.knownLengthFeet;
  const calibration = {
    ...input,
    drawingUnitsPerFoot,
    confirmedById: context.userId,
    confirmedAt: new Date().toISOString(),
  };
  await prisma.$transaction(async (tx) => {
    await tx.cadAnalysis.update({
      where: { cadFileId: id },
      data: { scaleCalibration: calibration, calibrationConfirmedAt: new Date() },
    });
    await tx.cadReviewIssue.updateMany({
      where: { tenantId: context.tenantId, cadFileId: id, code: "SCALE_REQUIRED", resolved: false },
      data: { resolved: true },
    });
    await tx.cadReviewIssue.deleteMany({
      where: { tenantId: context.tenantId, cadFileId: id, code: "AREA_MISMATCH", resolved: false },
    });
    for (const entity of file.scenes[0].entities.filter((candidate) => candidate.type === CadEntityType.PLOT)) {
      const drawingArea = readMeasurement(entity.measurements, "areaPdfPoints")
        ?? readMeasurement(entity.measurements, "areaCadUnits");
      if (drawingArea === undefined) continue;
      const calculatedAreaSqft = drawingArea / (drawingUnitsPerFoot ** 2);
      const printedAreaSqft = readMeasurement(entity.measurements, "printedAreaSqft");
      const mismatchPct = printedAreaSqft && printedAreaSqft > 0
        ? Math.abs(calculatedAreaSqft - printedAreaSqft) / printedAreaSqft * 100
        : undefined;
      const measurements = {
        ...jsonRecord(entity.measurements),
        calculatedAreaSqft,
        areaSqft: calculatedAreaSqft,
        ...(mismatchPct === undefined ? {} : { areaMismatchPct: mismatchPct }),
      };
      await tx.cadEntity.update({
        where: { id: entity.id },
        data: { measurements },
      });
      if (mismatchPct !== undefined && mismatchPct > 2) {
        await tx.cadReviewIssue.create({
          data: {
            tenantId: context.tenantId,
            cadFileId: id,
            entityId: entity.id,
            severity: InsightSeverity.MEDIUM,
            code: "AREA_MISMATCH",
            message: `Printed area and calibrated geometry differ by ${mismatchPct.toFixed(1)}%.`,
            blocking: false,
            metadata: { printedAreaSqft, calculatedAreaSqft, mismatchPct },
          },
        });
      }
    }
    await tx.cadFile.update({
      where: { id },
      data: { status: CadStatus.REVIEW_REQUIRED },
    });
  }, { timeout: 180_000 });
  await writeAuditEvent(context, {
    action: AuditAction.REVIEW,
    entityType: "CadFile",
    entityId: id,
    after: { scaleCalibration: calibration },
  });
  return getCadAnalysis(context, id);
}

export async function reviewCadBatch(context: RequestContext, id: string, input: z.infer<typeof cadBatchReviewSchema>) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: { scenes: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } },
  });
  const scene = file.scenes[0];
  if (!scene) throwBadRequest("Map candidates are not ready");
  const changed = await prisma.cadEntity.updateMany({
    where: { id: { in: input.entityIds }, tenantId: context.tenantId, sceneId: scene.id },
    data: { status: input.status },
  });
  if (input.resolvedIssueIds.length) {
    await prisma.cadReviewIssue.updateMany({
      where: { id: { in: input.resolvedIssueIds }, tenantId: context.tenantId, cadFileId: id },
      data: { resolved: true },
    });
  }
  await writeAuditEvent(context, {
    action: AuditAction.REVIEW,
    entityType: "CadFile",
    entityId: id,
    after: { batchStatus: input.status, entityIds: input.entityIds, changed: changed.count },
  });
  return getCadCandidates(context, id);
}

const reviewedEntitySchema = z.object({
  entityId: z.string(),
  type: z.nativeEnum(CadEntityType).optional(),
  label: z.string().optional(),
  geometry: z.record(z.unknown()).optional(),
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
          geometry: entity.geometry as Prisma.InputJsonValue | undefined,
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
    after: input as unknown as Prisma.InputJsonValue,
  });

  return getCadScene(context, id);
}

export async function publishCad(context: RequestContext, id: string, input: z.infer<typeof cadPublishSchema> = {}) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      analysis: true,
      reviewIssues: { where: { resolved: false } },
      scenes: { include: { entities: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (file.status === CadStatus.PUBLISHED) throwBadRequest("This Map version is already published");
  if (file.status !== CadStatus.REVIEW_REQUIRED) throwBadRequest("Complete drawing setup, extraction, calibration, and candidate review before publishing");
  const scene = file.scenes[0];
  if (!scene) throwBadRequest("Map candidates are not ready for publish");

  const confirmedEntities = scene.entities.filter((entity) => entity.status === "CONFIRMED");
  if (!confirmedEntities.length) throwBadRequest("Confirm at least one reviewed candidate before publishing");
  const confirmedPlots = confirmedEntities.filter((entity) => entity.type === CadEntityType.PLOT);
  if (confirmedPlots.length && !file.analysis?.calibrationConfirmedAt) {
    throwBadRequest("Confirm drawing scale before publishing plots");
  }
  validateConfirmedPlots(confirmedPlots);
  const expectedPlotCount = readMeasurement(file.analysis?.expectedCounts ?? null, "total");
  const confirmedCountMismatch = expectedPlotCount !== undefined && confirmedPlots.length !== expectedPlotCount;

  const blockingIssues = file.reviewIssues.filter((issue) => {
    if (!issue.blocking) return false;
    if (!issue.entityId) return true;
    return confirmedEntities.some((entity) => entity.id === issue.entityId);
  });
  const overrideable = blockingIssues.filter((issue) => issue.code === "PLOT_COUNT_MISMATCH");
  const nonOverrideable = blockingIssues.filter((issue) => issue.code !== "PLOT_COUNT_MISMATCH");
  if (nonOverrideable.length) {
    throwBadRequest(`Resolve ${nonOverrideable.length} blocking Map issue${nonOverrideable.length === 1 ? "" : "s"} before publishing`);
  }
  if ((overrideable.length || confirmedCountMismatch) && !input.overrideReason) {
    throwBadRequest(`The drawing states ${expectedPlotCount ?? "a different number of"} plots, but ${confirmedPlots.length} reviewed plots are confirmed. Resolve the difference or provide a publish override reason.`);
  }
  if (file.projectId && confirmedPlots.length) {
    const existing = await prisma.plot.findMany({
      where: {
        tenantId: context.tenantId,
        projectId: file.projectId,
        archivedAt: null,
        code: { in: confirmedPlots.map((entity) => entity.label as string) },
      },
      select: { code: true },
    });
    if (existing.length) {
      throwBadRequest(`Plots already exist with these codes: ${existing.slice(0, 10).map((plot) => plot.code).join(", ")}. Roll back the prior Map publish or resolve duplicates first.`);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const plots = [];
    const assets = [];
    const checklistItems = [];
    const batch = await tx.cadPublishBatch.create({
      data: {
        tenantId: context.tenantId,
        cadFileId: id,
        sceneId: scene.id,
        publishedById: context.userId,
        summary: {
          confirmedCandidates: confirmedEntities.length,
          confirmedPlots: confirmedPlots.length,
          expectedPlots: expectedPlotCount,
          overrideReason: input.overrideReason,
        },
      },
    });

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
            publishBatchId: batch.id,
            linkConfidence: entity.confidence,
          },
        });
        checklistItems.push(item);
      } else if (file.parentType === "PROJECT" && entity.type === "PLOT" && file.projectId) {
        const plot = await tx.plot.create({
          data: {
            tenantId: context.tenantId,
            projectId: file.projectId,
            code: entity.label as string,
            label: entity.label,
            geometry: entity.geometry as Prisma.InputJsonValue,
            areaSqft: calibratedAreaSqft(entity.measurements, file.analysis?.scaleCalibration),
          },
        });
        await tx.ownershipRecord.create({
          data: {
            tenantId: context.tenantId,
            plotId: plot.id,
            ownerId: null,
            kind: "COMPANY_INVENTORY",
            amountInr: plot.priceInr,
            sharePct: 100,
            notes: `Company inventory created from reviewed Map publish ${batch.id}.`,
            createdById: context.userId,
          },
        });
        await tx.spatialLink.create({
          data: {
            tenantId: context.tenantId,
            cadEntityId: entity.id,
            recordType: "Plot",
            recordId: plot.id,
            publishBatchId: batch.id,
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
            publishBatchId: batch.id,
            linkConfidence: entity.confidence,
          },
        });
        assets.push(asset);
      }
    }

    await tx.cadFile.update({ where: { id }, data: { status: CadStatus.PUBLISHED } });
    await tx.cadScene.update({ where: { id: scene.id }, data: { publishedAt: new Date() } });
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
    if (input.overrideReason) {
      await tx.cadReviewIssue.updateMany({
        where: { tenantId: context.tenantId, cadFileId: id, code: "PLOT_COUNT_MISMATCH", resolved: false },
        data: { resolved: true },
      });
    }

    return { batch, plots, assets, checklistItems };
  });

  await writeAuditEvent(context, {
    action: AuditAction.PUBLISH,
    entityType: "CadFile",
    entityId: id,
    after: {
      publishBatchId: result.batch.id,
      plotCount: result.plots.length,
      assetCount: result.assets.length,
      checklistItemCount: result.checklistItems.length,
      overrideReason: input.overrideReason,
    },
  });
  await createNotification(context, {
    title: "Map published",
    body: `Published ${result.plots.length} plots, ${result.assets.length} site assets, and ${result.checklistItems.length} plot zones from ${file.originalName}.`,
    data: { cadFileId: id, publishBatchId: result.batch.id, plotCount: result.plots.length, assetCount: result.assets.length, checklistItemCount: result.checklistItems.length },
  });

  return result;
}

export async function getCadPreview(context: RequestContext, id: string) {
  const analysis = await prisma.cadAnalysis.findFirstOrThrow({
    where: { cadFileId: id, tenantId: context.tenantId },
    select: { previewArtifactKey: true },
  });
  if (!analysis.previewArtifactKey) throwNotFound("Map preview is not available");
  return {
    bytes: await getObjectResilient(analysis.previewArtifactKey),
    contentType: analysis.previewArtifactKey.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  };
}

export async function rollbackCadPublish(context: RequestContext, id: string, input: z.infer<typeof cadRollbackSchema>) {
  const file = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { entities: { include: { spatialLinks: true } } },
      },
      publishBatches: {
        where: { rolledBackAt: null },
        orderBy: { publishedAt: "desc" },
        take: 1,
        include: { spatialLinks: true },
      },
    },
  });
  const batch = file.publishBatches[0] ?? null;
  const legacyLinks = file.scenes[0]?.entities.flatMap((entity) => entity.spatialLinks).filter((link) => !link.publishBatchId) ?? [];
  const links = batch?.spatialLinks.length ? batch.spatialLinks : legacyLinks;
  if (!links.length) throwBadRequest("No published Map-created records were found for this version");

  const plotIds = [...new Set(links.filter((link) => link.recordType === "Plot").map((link) => link.recordId))];
  const assetIds = [...new Set(links.filter((link) => link.recordType === "SiteAsset").map((link) => link.recordId))];
  const checklistIds = [...new Set(links.filter((link) => link.recordType === "ChecklistItem").map((link) => link.recordId))];
  const plotChecks = await Promise.all(plotIds.map(async (plotId) => {
    const [plot, ownershipActivity, registryCount, fileCount, documentCount, checklistCount, progressCount, issueCount] = await Promise.all([
      prisma.plot.findFirst({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } }),
      prisma.ownershipRecord.count({
        where: {
          tenantId: context.tenantId,
          plotId,
          OR: [{ kind: { not: "COMPANY_INVENTORY" } }, { ownerId: { not: null } }],
        },
      }),
      prisma.registryRecord.count({ where: { tenantId: context.tenantId, plotId } }),
      prisma.fileAsset.count({ where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: plotId } }),
      prisma.generatedDocument.count({ where: { tenantId: context.tenantId, recordType: "Plot", recordId: plotId } }),
      prisma.checklistItem.count({ where: { tenantId: context.tenantId, plotId } }),
      prisma.progressUpdate.count({ where: { tenantId: context.tenantId, parentType: "Plot", parentId: plotId } }),
      prisma.issue.count({ where: { tenantId: context.tenantId, parentType: "Plot", parentId: plotId } }),
    ]);
    const reasons = [];
    if (!plot) reasons.push("plot record missing");
    if (plot?.currentOwnerId) reasons.push("current owner exists");
    if (ownershipActivity) reasons.push("ownership activity exists");
    if (registryCount) reasons.push("registry records exist");
    if (fileCount) reasons.push("documents exist");
    if (documentCount) reasons.push("generated letters exist");
    if (checklistCount) reasons.push("development checklist exists");
    if (progressCount) reasons.push("progress updates exist");
    if (issueCount) reasons.push("issues exist");
    return { id: plotId, code: plot?.code ?? plotId, safe: reasons.length === 0, reasons };
  }));
  const assetChecks = await Promise.all(assetIds.map(async (assetId) => {
    const [asset, progressCount, issueCount, fileCount] = await Promise.all([
      prisma.siteAsset.findFirst({ where: { id: assetId, tenantId: context.tenantId } }),
      prisma.progressUpdate.count({ where: { tenantId: context.tenantId, parentType: "SiteAsset", parentId: assetId } }),
      prisma.issue.count({ where: { tenantId: context.tenantId, parentType: "SiteAsset", parentId: assetId } }),
      prisma.fileAsset.count({ where: { tenantId: context.tenantId, ownerType: "SiteAsset", ownerId: assetId } }),
    ]);
    const reasons = [];
    if (!asset) reasons.push("asset record missing");
    if (progressCount) reasons.push("progress updates exist");
    if (issueCount) reasons.push("issues exist");
    if (fileCount) reasons.push("documents exist");
    return { id: assetId, name: asset?.name ?? assetId, safe: reasons.length === 0, reasons };
  }));
  const checklistChecks = await Promise.all(checklistIds.map(async (checklistId) => {
    const [item, progressCount, issueCount, fileCount] = await Promise.all([
      prisma.checklistItem.findFirst({ where: { id: checklistId, tenantId: context.tenantId } }),
      prisma.progressUpdate.count({ where: { tenantId: context.tenantId, parentType: "ChecklistItem", parentId: checklistId } }),
      prisma.issue.count({ where: { tenantId: context.tenantId, parentType: "ChecklistItem", parentId: checklistId } }),
      prisma.fileAsset.count({ where: { tenantId: context.tenantId, ownerType: "ChecklistItem", ownerId: checklistId } }),
    ]);
    const reasons = [];
    if (!item) reasons.push("checklist item missing");
    if (progressCount) reasons.push("progress updates exist");
    if (issueCount) reasons.push("issues exist");
    if (fileCount) reasons.push("documents exist");
    return { id: checklistId, label: item?.label ?? checklistId, safe: reasons.length === 0, reasons };
  }));
  const preview = {
    publishBatchId: batch?.id ?? null,
    safePlots: plotChecks.filter((item) => item.safe),
    protectedPlots: plotChecks.filter((item) => !item.safe),
    safeAssets: assetChecks.filter((item) => item.safe),
    protectedAssets: assetChecks.filter((item) => !item.safe),
    safeChecklistItems: checklistChecks.filter((item) => item.safe),
    protectedChecklistItems: checklistChecks.filter((item) => !item.safe),
  };
  if (!input.confirm) return { preview, rolledBack: false };
  if (!input.reason) throwBadRequest("Provide a rollback reason");

  const rolledBack = await prisma.$transaction(async (tx) => {
    const activeBatch = batch ?? await tx.cadPublishBatch.create({
      data: {
        tenantId: context.tenantId,
        cadFileId: id,
        sceneId: file.scenes[0]?.id,
        status: "LEGACY_PUBLISHED",
        publishedById: context.userId,
        summary: { legacyLinks: links.length },
      },
    });
    if (!batch && legacyLinks.length) {
      await tx.spatialLink.updateMany({
        where: { id: { in: legacyLinks.map((link) => link.id) }, tenantId: context.tenantId },
        data: { publishBatchId: activeBatch.id },
      });
    }
    const now = new Date();
    const safePlotIds = preview.safePlots.map((plot) => plot.id);
    const safeAssetIds = preview.safeAssets.map((asset) => asset.id);
    const safeChecklistIds = preview.safeChecklistItems.map((item) => item.id);
    const hasProtectedRecords = Boolean(
      preview.protectedPlots.length
      || preview.protectedAssets.length
      || preview.protectedChecklistItems.length,
    );
    if (safePlotIds.length) {
      await tx.plot.updateMany({
        where: { id: { in: safePlotIds }, tenantId: context.tenantId },
        data: { archivedAt: now, archiveReason: input.reason },
      });
    }
    if (safeAssetIds.length) {
      await tx.siteAsset.updateMany({
        where: { id: { in: safeAssetIds }, tenantId: context.tenantId },
        data: { archivedAt: now, archiveReason: input.reason },
      });
    }
    if (safeChecklistIds.length) {
      await tx.checklistItem.deleteMany({ where: { id: { in: safeChecklistIds }, tenantId: context.tenantId } });
    }
    await tx.cadPublishBatch.update({
      where: { id: activeBatch.id },
      data: {
        status: hasProtectedRecords ? "PARTIAL_ROLLBACK" : "ROLLED_BACK",
        rolledBackAt: now,
        rolledBackById: context.userId,
        rollbackReason: input.reason,
      },
    });
    await tx.cadFile.update({
      where: { id },
      data: { status: hasProtectedRecords ? CadStatus.PUBLISHED : CadStatus.UPLOADED, errorMessage: null },
    });
    return {
      publishBatchId: activeBatch.id,
      archivedPlotCount: safePlotIds.length,
      archivedAssetCount: safeAssetIds.length,
      deletedChecklistItemCount: safeChecklistIds.length,
      partial: hasProtectedRecords,
    };
  });
  const queue = rolledBack.partial
    ? { queued: false, reason: "protected_records_preserve_published_scene" }
    : scheduleCadPdfProcessing({ cadFileId: id, tenantId: context.tenantId, mode: "inspect" });
  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "CadPublishBatch",
    entityId: rolledBack.publishBatchId,
    after: {
      ...rolledBack,
      protectedPlots: preview.protectedPlots,
      protectedAssets: preview.protectedAssets,
      protectedChecklistItems: preview.protectedChecklistItems,
      reason: input.reason,
      reinspectionQueue: queue,
    },
  });
  return { preview, rolledBack: true, result: rolledBack, queue };
}

function validateConfirmedPlots(plots: Array<{ label: string | null; geometry: Prisma.JsonValue }>) {
  const seen = new Set<string>();
  for (const plot of plots) {
    const label = plot.label?.trim().toUpperCase();
    if (!label || !/^(?:[A-Z]{0,2}[-/]?)?\d{1,4}[A-Z]?$/.test(label) || ["PLOT", "PLOTS", "PLOTTING"].includes(label)) {
      throwBadRequest(`Invalid plot number cannot be published: ${plot.label ?? "blank"}`);
    }
    if (seen.has(label)) throwBadRequest(`Duplicate plot number cannot be published: ${label}`);
    seen.add(label);
    if (!isClosedCandidateGeometry(plot.geometry)) throwBadRequest(`Plot ${label} does not have a closed boundary`);
  }
}

function isClosedCandidateGeometry(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const geometry = value as Record<string, unknown>;
  return geometry.closed === true && Array.isArray(geometry.points) && geometry.points.length >= 4;
}

function calibratedAreaSqft(measurements: Prisma.JsonValue | null, calibration: Prisma.JsonValue | null | undefined) {
  const direct = readMeasurement(measurements, "calculatedAreaSqft")
    ?? readMeasurement(measurements, "areaSqft")
    ?? readMeasurement(measurements, "printedAreaSqft");
  if (direct !== undefined) return direct;
  const drawingArea = readMeasurement(measurements, "areaCadUnits") ?? readMeasurement(measurements, "areaPdfPoints");
  if (drawingArea === undefined || !calibration || typeof calibration !== "object" || Array.isArray(calibration)) return undefined;
  const unitsPerFoot = (calibration as Record<string, unknown>).drawingUnitsPerFoot;
  return typeof unitsPerFoot === "number" && unitsPerFoot > 0 ? drawingArea / (unitsPerFoot ** 2) : undefined;
}

function jsonRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Prisma.JsonValue>
    : {};
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
    await prisma.plot.findFirstOrThrow({ where: { id: input.parentId, tenantId: context.tenantId, archivedAt: null } });
    return;
  }
  if (input.parentType === "SITE_ASSET") {
    await prisma.siteAsset.findFirstOrThrow({ where: { id: input.parentId, tenantId: context.tenantId, archivedAt: null } });
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
    include: { analysis: true },
  });
  if (cadFile.status === CadStatus.PUBLISHED) throwBadRequest("Published Map versions are immutable and cannot be processed again");
  try {
    await getObjectResilient(cadFile.storageKey);
  } catch {
    throwBadRequest("The uploaded Map file is missing from storage. Re-upload the DXF file to repair this Map record.");
  }

  if (cadFile.format === CadFormat.DXF || cadFile.format === CadFormat.DWG) {
    const updated = await prisma.cadFile.update({
      where: { id },
      data: {
        status: CadStatus.UPLOADED,
        errorMessage: null,
        processingLog: {
          parserEngine: "mlightcad-browser",
          stage: "WAITING_FOR_BROWSER",
          progressLabel: "Reopen this drawing to parse it again in your browser.",
          retriedAt: new Date().toISOString(),
        },
      },
    });
    await writeAuditEvent(context, {
      action: AuditAction.UPDATE,
      entityType: "CadFile",
      entityId: id,
      after: { retried, parserEngine: "mlightcad-browser" },
    });
    return {
      cadFile: updated,
      queue: { queued: false, reason: "browser_extraction_required" },
    };
  }

  const updated = await prisma.cadFile.update({
    where: { id },
    data: { status: CadStatus.UPLOADED, errorMessage: null, processingLog: Prisma.JsonNull },
  });
  const mode = cadFile.analysis?.setupConfirmedAt ? "extract" : "inspect";
  const queue = scheduleCadPdfProcessing({ cadFileId: cadFile.id, tenantId: context.tenantId, mode });
  if (!queue.queued) throwBadRequest(`PDF map processing is unavailable: ${queue.reason}`);
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "CadFile",
    entityId: id,
    after: { processingScheduled: true, retried, mode, queue },
  });
  await createNotification(context, {
    title: retried ? "Map processing retried" : "Map processing started",
    body: `${cadFile.originalName} is processing Map ${mode === "inspect" ? "inspection" : "extraction"}.`,
    data: { cadFileId: id, status: updated.status, mode, queue },
  });
  return { cadFile: updated, queue };
}

export async function replaceCadFile(
  context: RequestContext,
  id: string,
  input: { bytes: Buffer; originalName: string; contentType: string; format: CadFormat },
) {
  const before = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
  });
  if (before.status === CadStatus.PUBLISHED) {
    throwBadRequest("Published Map versions are immutable. Upload a new Map version instead.");
  }
  validateCadBytes(input.bytes, input.format);

  const originalName = safeCadFileName(input.originalName, input.format);
  const key = storageKey([
    context.tenantId,
    "cad",
    before.parentType.toLowerCase(),
    before.parentId,
    `${Date.now()}-${originalName}`,
  ]);
  const stored = await putObjectResilient(key, input.bytes, input.contentType, {
    mirrorLocalOnS3Success: true,
  });
  const cadFile = await prisma.cadFile.update({
    where: { id },
    data: {
      originalName,
      format: input.format,
      storageKey: stored.storageKey,
      status: CadStatus.UPLOADED,
      errorMessage: null,
      processingLog: {
        storageProvider: stored.storageProvider,
        fallbackStorageKey: stored.fallbackStorageKey,
        storageWarning: stored.warning,
        replacedAt: new Date().toISOString(),
      },
    },
  });
  const browserExtraction = input.format === CadFormat.DXF || input.format === CadFormat.DWG;
  const queue = browserExtraction
    ? { queued: false, reason: "browser_extraction_required" }
    : scheduleCadPdfProcessing({ cadFileId: cadFile.id, tenantId: context.tenantId, mode: "inspect" });
  if (!browserExtraction && !queue.queued) {
    await prisma.cadFile.update({
      where: { id },
      data: { status: CadStatus.FAILED, errorMessage: queue.reason },
    });
  }
  if (browserExtraction) {
    await prisma.cadAnalysis.deleteMany({ where: { tenantId: context.tenantId, cadFileId: id } });
  }

  await writeAuditEvent(context, {
    action: AuditAction.UPLOAD,
    entityType: "CadFile",
    entityId: id,
    before: {
      originalName: before.originalName,
      storageKey: before.storageKey,
      status: before.status,
    },
    after: {
      originalName: cadFile.originalName,
      storageKey: cadFile.storageKey,
      storageProvider: stored.storageProvider,
      replacementUpload: true,
      processingQueued: queue.queued,
      parserEngine: browserExtraction ? "mlightcad-browser" : undefined,
    },
  });

  return { cadFile, storage: stored, queue };
}

function validateCadBytes(bytes: Buffer, format: CadFormat) {
  if (format === CadFormat.VECTOR_PDF && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throwBadRequest("The uploaded file is not a valid PDF. Export the drawing again as a vector PDF.");
  }
  if (format === CadFormat.DXF) {
    const header = bytes.subarray(0, Math.min(bytes.length, 4096)).toString("latin1");
    const isAsciiDxf = /\bSECTION\b/i.test(header) || /\bENTITIES\b/i.test(header);
    const isBinaryDxf = header.startsWith("AutoCAD Binary DXF");
    if (!isAsciiDxf && !isBinaryDxf) {
      throwBadRequest("The uploaded file does not appear to be a valid DXF. Export it again from the mapping application.");
    }
  }
  if (format === CadFormat.DWG) {
    const signature = bytes.subarray(0, 6).toString("ascii");
    if (!/^AC10\d{2}$/.test(signature)) {
      throwBadRequest("The uploaded file does not appear to be a valid DWG drawing.");
    }
  }
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
      where: { id: link.recordId, tenantId: context.tenantId, archivedAt: null },
      include: { currentOwner: true, registryRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const documentCount = await prisma.fileAsset.count({ where: { tenantId: context.tenantId, ownerType: "Plot", ownerId: link.recordId } });
    return { entity, link, record: plot ? { ...plot, documentCount } : null };
  }

  if (link.recordType === "SiteAsset") {
    const asset = await prisma.siteAsset.findFirst({
      where: { id: link.recordId, tenantId: context.tenantId, archivedAt: null },
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

export async function deleteCadFile(context: RequestContext, id: string, input: z.infer<typeof deleteCadSchema>) {
  const before = await prisma.cadFile.findFirstOrThrow({
    where: { id, tenantId: context.tenantId },
    include: {
      scenes: { select: { id: true, entities: { select: { id: true } } } },
      versions: { select: { id: true } },
      publishBatches: { select: { id: true } },
      reviewIssues: { select: { id: true } },
    },
  });
  if (before.status === CadStatus.PUBLISHED) {
    throwBadRequest("Published Map versions cannot be deleted. Upload a new version or keep the published audit trail.");
  }
  if (before.versions.length || before.publishBatches.length) {
    throwBadRequest("Map versions with a publish history cannot be deleted. Use publish rollback and keep the audit trail.");
  }

  const entityIds = before.scenes.flatMap((scene) => scene.entities.map((entity) => entity.id));
  const sceneIds = before.scenes.map((scene) => scene.id);
  const file = await prisma.$transaction(async (tx) => {
    if (entityIds.length) await tx.spatialLink.deleteMany({ where: { tenantId: context.tenantId, cadEntityId: { in: entityIds } } });
    await tx.cadReviewIssue.deleteMany({ where: { tenantId: context.tenantId, cadFileId: id } });
    if (entityIds.length) await tx.cadEntity.deleteMany({ where: { tenantId: context.tenantId, id: { in: entityIds } } });
    if (sceneIds.length) await tx.cadLayer.deleteMany({ where: { tenantId: context.tenantId, sceneId: { in: sceneIds } } });
    if (sceneIds.length) await tx.cadScene.deleteMany({ where: { tenantId: context.tenantId, id: { in: sceneIds } } });
    await tx.cadVersion.deleteMany({ where: { tenantId: context.tenantId, cadFileId: id } });
    await tx.cadExtractionRun.deleteMany({ where: { tenantId: context.tenantId, cadFileId: id } });
    await tx.cadAnalysis.deleteMany({ where: { tenantId: context.tenantId, cadFileId: id } });
    return tx.cadFile.delete({ where: { id } });
  });

  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "CadFile",
    entityId: id,
    before: before as unknown as Prisma.InputJsonValue,
    after: { deletedAt: new Date().toISOString(), deletedById: context.userId, deleteReason: input.reason },
  });

  return file;
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}

function throwNotFound(message: string): never {
  const error = new Error(message);
  error.name = "NotFoundError";
  throw error;
}
