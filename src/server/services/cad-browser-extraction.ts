import { createHash } from "node:crypto";
import {
  AuditAction,
  CadEntityType,
  CadExtractionStatus,
  CadFormat,
  CadScope,
  CadStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { getObjectResilient, putObjectResilient, storageKey } from "../storage";
import { persistCadExtractionResult } from "./cad";

const boundsSchema = z.object({
  minX: z.number().finite(),
  minY: z.number().finite(),
  maxX: z.number().finite(),
  maxY: z.number().finite(),
}).refine((value) => value.maxX > value.minX && value.maxY > value.minY, {
  message: "Drawing bounds are invalid",
});

const layerSchema = z.object({
  name: z.string().trim().min(1).max(500),
  color: z.string().max(40).optional(),
  visible: z.boolean().default(true),
  purpose: z.string().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createBrowserExtractionSchema = z.object({
  parserEngine: z.literal("mlightcad-browser"),
  parserVersion: z.string().trim().min(1).max(80),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  drawingUnits: z.string().trim().max(80).optional(),
  bounds: boundsSchema,
  expectedEntityCount: z.number().int().nonnegative().max(250_000),
  expectedChunkCount: z.number().int().positive().max(5_000),
  layers: z.array(layerSchema).max(5_000),
  metadata: z.record(z.unknown()).optional(),
});

const normalizedEntitySchema = z.object({
  sourceHandle: z.string().trim().min(1).max(256),
  sourceHandles: z.array(z.string().trim().min(1).max(256)).max(128).optional(),
  nativeType: z.string().trim().min(1).max(100),
  layer: z.string().trim().max(500).default("0"),
  blockPath: z.array(z.string().max(300)).max(32).default([]),
  label: z.string().max(500).nullable().optional(),
  geometry: z.record(z.unknown()),
  measurements: z.record(z.unknown()).optional(),
  attributes: z.record(z.unknown()).optional(),
  suggestedType: z.nativeEnum(CadEntityType).optional(),
  confidence: z.number().min(0).max(1).optional(),
  validation: z.record(z.unknown()).optional(),
});

export const browserExtractionChunkSchema = z.object({
  entities: z.array(normalizedEntitySchema).max(1_000),
});

type BrowserEntity = z.infer<typeof normalizedEntitySchema>;

export async function getCadSource(context: RequestContext, cadFileId: string) {
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: {
      id: cadFileId,
      tenantId: context.tenantId,
      format: { in: [CadFormat.DXF, CadFormat.DWG] },
    },
  });
  const bytes = await getObjectResilient(cadFile.storageKey);
  return {
    cadFile,
    bytes,
    sha256: sha256(bytes),
    contentType: cadFile.format === CadFormat.DWG
      ? "application/acad"
      : "application/dxf",
  };
}

export async function listBrowserExtractions(context: RequestContext, cadFileId: string) {
  await getBrowserCadFile(context, cadFileId);
  return prisma.cadExtractionRun.findMany({
    where: { tenantId: context.tenantId, cadFileId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function createBrowserExtraction(
  context: RequestContext,
  cadFileId: string,
  input: z.infer<typeof createBrowserExtractionSchema>,
) {
  const cadFile = await getBrowserCadFile(context, cadFileId);
  if (cadFile.status === CadStatus.PUBLISHED) {
    throwBadRequest("Published CAD versions are immutable. Upload a new version to extract again.");
  }

  const bytes = await getObjectResilient(cadFile.storageKey);
  const serverSha256 = sha256(bytes);
  if (serverSha256 !== input.sourceSha256.toLowerCase()) {
    throwBadRequest("The parsed drawing does not match the stored CAD file. Reopen the drawing and try again.");
  }

  const calibration = calibrationForUnits(input.drawingUnits);
  const manifest = JSON.parse(JSON.stringify({
    layers: deduplicateLayers(input.layers),
    metadata: input.metadata ?? {},
    sourceFileName: cadFile.originalName,
  })) as Prisma.InputJsonValue;

  const run = await prisma.$transaction(async (tx) => {
    await tx.cadExtractionRun.updateMany({
      where: {
        tenantId: context.tenantId,
        cadFileId,
        status: { in: [CadExtractionStatus.CREATED, CadExtractionStatus.UPLOADING, CadExtractionStatus.VALIDATING] },
      },
      data: { status: CadExtractionStatus.CANCELLED },
    });
    const created = await tx.cadExtractionRun.create({
      data: {
        tenantId: context.tenantId,
        cadFileId,
        parserEngine: input.parserEngine,
        parserVersion: input.parserVersion,
        sourceSha256: serverSha256,
        drawingUnits: input.drawingUnits,
        bounds: input.bounds,
        expectedEntityCount: input.expectedEntityCount,
        expectedChunkCount: input.expectedChunkCount,
        receivedChunks: [],
        manifest,
        status: CadExtractionStatus.CREATED,
        createdById: context.userId,
      },
    });
    await tx.cadAnalysis.upsert({
      where: { cadFileId },
      update: {
        sourceKind: "MLIGHTCAD_BROWSER",
        discipline: disciplineForScope(cadFile.parentType),
        proposedRegion: { x: 0, y: 0, width: 1, height: 1 },
        confirmedRegion: { x: 0, y: 0, width: 1, height: 1 },
        inspection: {
          parserEngine: input.parserEngine,
          parserVersion: input.parserVersion,
          sourceSha256: serverSha256,
          drawingUnits: input.drawingUnits ?? "unitless",
          bounds: input.bounds,
          layerCount: input.layers.length,
        },
        scaleCalibration: calibration ?? undefined,
        calibrationConfirmedAt: calibration ? new Date() : null,
        setupConfirmedAt: new Date(),
      },
      create: {
        tenantId: context.tenantId,
        cadFileId,
        sourceKind: "MLIGHTCAD_BROWSER",
        discipline: disciplineForScope(cadFile.parentType),
        proposedRegion: { x: 0, y: 0, width: 1, height: 1 },
        confirmedRegion: { x: 0, y: 0, width: 1, height: 1 },
        inspection: {
          parserEngine: input.parserEngine,
          parserVersion: input.parserVersion,
          sourceSha256: serverSha256,
          drawingUnits: input.drawingUnits ?? "unitless",
          bounds: input.bounds,
          layerCount: input.layers.length,
        },
        scaleCalibration: calibration ?? undefined,
        calibrationConfirmedAt: calibration ? new Date() : undefined,
        setupConfirmedAt: new Date(),
      },
    });
    await tx.cadFile.update({
      where: { id: cadFileId },
      data: {
        status: CadStatus.PARSING,
        errorMessage: null,
        processingLog: {
          parserEngine: input.parserEngine,
          parserVersion: input.parserVersion,
          extractionRunId: created.id,
          stage: "UPLOADING_EXTRACTION",
          progressLabel: "Uploading normalized CAD entities for validation.",
          expectedChunkCount: input.expectedChunkCount,
          receivedChunkCount: 0,
          startedAt: new Date().toISOString(),
        },
      },
    });
    return created;
  });

  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "CadExtractionRun",
    entityId: run.id,
    after: {
      cadFileId,
      parserEngine: run.parserEngine,
      parserVersion: run.parserVersion,
      sourceSha256: run.sourceSha256,
      expectedEntityCount: run.expectedEntityCount,
      expectedChunkCount: run.expectedChunkCount,
    },
  });
  return run;
}

export async function uploadBrowserExtractionChunk(
  context: RequestContext,
  cadFileId: string,
  runId: string,
  index: number,
  input: z.infer<typeof browserExtractionChunkSchema>,
) {
  const run = await getExtractionRun(context, cadFileId, runId);
  if (run.status !== CadExtractionStatus.CREATED && run.status !== CadExtractionStatus.UPLOADING) {
    throwBadRequest("This extraction run no longer accepts chunks.");
  }
  if (!Number.isInteger(index) || index < 0 || index >= run.expectedChunkCount) {
    throwBadRequest("Extraction chunk index is outside the expected range.");
  }
  validateEntityCollection(input.entities);

  const key = storageKey([
    context.tenantId,
    "cad",
    cadFileId,
    "extractions",
    runId,
    `chunk-${String(index).padStart(5, "0")}.json`,
  ]);
  const stored = await putObjectResilient(
    key,
    Buffer.from(JSON.stringify(input)),
    "application/json",
    { mirrorLocalOnS3Success: true },
  );

  const current = chunkEntries(run.receivedChunks);
  const next = [
    ...current.filter((entry) => entry.index !== index),
    { index, storageKey: stored.storageKey, count: input.entities.length },
  ].sort((a, b) => a.index - b.index);

  const updated = await prisma.$transaction(async (tx) => {
    const value = await tx.cadExtractionRun.update({
      where: { id: runId },
      data: {
        status: CadExtractionStatus.UPLOADING,
        receivedChunks: next,
      },
    });
    await tx.cadFile.update({
      where: { id: cadFileId },
      data: {
        processingLog: {
          parserEngine: run.parserEngine,
          parserVersion: run.parserVersion,
          extractionRunId: run.id,
          stage: "UPLOADING_EXTRACTION",
          progressLabel: `Uploaded ${next.length} of ${run.expectedChunkCount} extraction chunks.`,
          expectedChunkCount: run.expectedChunkCount,
          receivedChunkCount: next.length,
          heartbeatAt: new Date().toISOString(),
        },
      },
    });
    return value;
  });

  return {
    run: updated,
    chunk: { index, count: input.entities.length, receivedChunkCount: next.length },
  };
}

export async function completeBrowserExtraction(
  context: RequestContext,
  cadFileId: string,
  runId: string,
) {
  const run = await getExtractionRun(context, cadFileId, runId);
  const entries = chunkEntries(run.receivedChunks);
  const expectedIndexes = Array.from({ length: run.expectedChunkCount }, (_, index) => index);
  const missing = expectedIndexes.filter((index) => !entries.some((entry) => entry.index === index));
  if (missing.length) {
    throwBadRequest(`Extraction is incomplete. Missing chunk${missing.length === 1 ? "" : "s"}: ${missing.slice(0, 20).join(", ")}.`);
  }

  await prisma.$transaction([
    prisma.cadExtractionRun.update({
      where: { id: runId },
      data: { status: CadExtractionStatus.VALIDATING, errorMessage: null },
    }),
    prisma.cadFile.update({
      where: { id: cadFileId },
      data: {
        status: CadStatus.EXTRACTING,
        errorMessage: null,
        processingLog: {
          parserEngine: run.parserEngine,
          parserVersion: run.parserVersion,
          extractionRunId: run.id,
          stage: "VALIDATING_EXTRACTION",
          progressLabel: "Validating CAD geometry, labels, units, and duplicates.",
          heartbeatAt: new Date().toISOString(),
        },
      },
    }),
  ]);

  try {
    const entities: BrowserEntity[] = [];
    for (const entry of entries) {
      const raw = await getObjectResilient(entry.storageKey);
      const parsed = browserExtractionChunkSchema.parse(JSON.parse(raw.toString("utf8")));
      entities.push(...parsed.entities);
    }
    if (entities.length !== run.expectedEntityCount) {
      throwBadRequest(`Extraction declared ${run.expectedEntityCount} entities but uploaded ${entities.length}.`);
    }
    validateEntityCollection(entities);

    const cadFile = await getBrowserCadFile(context, cadFileId);
    const manifest = jsonRecord(run.manifest);
    const layers = Array.isArray(manifest.layers)
      ? manifest.layers.filter((value): value is z.infer<typeof layerSchema> => layerSchema.safeParse(value).success)
      : [];
    const converted = entities.map((entity) => normalizeBusinessCandidate(entity, cadFile.parentType));
    const analysis = await prisma.cadAnalysis.findUniqueOrThrow({ where: { cadFileId } });

    await persistCadExtractionResult(
      context.tenantId,
      cadFileId,
      {
        analysis: {
          sourceKind: "MLIGHTCAD_BROWSER",
          discipline: disciplineForScope(cadFile.parentType),
          scaleCalibration: analysis.scaleCalibration,
          calibrationConfirmed: Boolean(analysis.calibrationConfirmedAt),
        },
        layers: layers.map((layer) => ({
          name: layer.name,
          color: layer.color,
          purpose: layer.purpose,
          metadata: layer.metadata,
        })),
        entities: converted,
      },
      analysis,
      `mlightcad-browser@${run.parserVersion}`,
    );

    const updated = await prisma.cadExtractionRun.update({
      where: { id: runId },
      data: {
        status: CadExtractionStatus.COMPLETED,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
    await writeAuditEvent(context, {
      action: AuditAction.REVIEW,
      entityType: "CadExtractionRun",
      entityId: runId,
      after: {
        cadFileId,
        entityCount: entities.length,
        parserEngine: run.parserEngine,
        parserVersion: run.parserVersion,
        completedAt: updated.completedAt?.toISOString(),
      },
    });
    return {
      run: updated,
      entityCount: entities.length,
      cadFile: await prisma.cadFile.findUniqueOrThrow({ where: { id: cadFileId } }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser CAD extraction validation failed.";
    const hasExistingScene = await prisma.cadScene.count({ where: { tenantId: context.tenantId, cadFileId } });
    await prisma.$transaction([
      prisma.cadExtractionRun.update({
        where: { id: runId },
        data: { status: CadExtractionStatus.FAILED, errorMessage: message },
      }),
      prisma.cadFile.update({
        where: { id: cadFileId },
        data: {
          status: hasExistingScene ? CadStatus.REVIEW_REQUIRED : CadStatus.FAILED,
          errorMessage: hasExistingScene ? null : message,
          processingLog: {
            parserEngine: run.parserEngine,
            extractionRunId: run.id,
            stage: "VALIDATION_FAILED",
            progressLabel: hasExistingScene
              ? "The new extraction failed validation. The previous review scene is still available."
              : "CAD extraction failed validation.",
            failureCode: "BROWSER_EXTRACTION_INVALID",
            diagnostic: message.slice(0, 1_000),
          },
        },
      }),
    ]);
    throw error;
  }
}

export async function cancelBrowserExtraction(
  context: RequestContext,
  cadFileId: string,
  runId: string,
) {
  const run = await getExtractionRun(context, cadFileId, runId);
  if (run.status === CadExtractionStatus.COMPLETED) {
    throwBadRequest("Completed extraction history cannot be deleted.");
  }
  return prisma.cadExtractionRun.update({
    where: { id: run.id },
    data: { status: CadExtractionStatus.CANCELLED },
  });
}

async function getBrowserCadFile(context: RequestContext, cadFileId: string) {
  return prisma.cadFile.findFirstOrThrow({
    where: {
      id: cadFileId,
      tenantId: context.tenantId,
      format: { in: [CadFormat.DXF, CadFormat.DWG] },
    },
  });
}

async function getExtractionRun(context: RequestContext, cadFileId: string, runId: string) {
  await getBrowserCadFile(context, cadFileId);
  return prisma.cadExtractionRun.findFirstOrThrow({
    where: { id: runId, cadFileId, tenantId: context.tenantId },
  });
}

function normalizeBusinessCandidate(entity: BrowserEntity, scope: CadScope) {
  const geometry = normalizeGeometry(entity.geometry);
  const type = classifyCandidate(entity, geometry, scope);
  const measurements = {
    ...(entity.measurements ?? {}),
    ...measureGeometry(geometry),
    nativeType: entity.nativeType,
    blockPath: entity.blockPath,
    attributes: entity.attributes ?? {},
  };
  return {
    type,
    label: cleanLabel(entity.label),
    confidence: normalizedConfidence(entity, type),
    geometry,
    measurements,
    validation: {
      ...(entity.validation ?? {}),
      parserEngine: "mlightcad-browser",
      nativeType: entity.nativeType,
      blockPath: entity.blockPath,
      sourceHandles: entity.sourceHandles ?? [entity.sourceHandle],
    },
    sourceHandle: entity.sourceHandle,
    layer: entity.layer || "0",
  };
}

function classifyCandidate(entity: BrowserEntity, geometry: Record<string, unknown>, scope: CadScope) {
  const layer = entity.layer.toUpperCase();
  const block = entity.blockPath.join(" ").toUpperCase();
  const text = `${layer} ${block} ${(entity.label ?? "").toUpperCase()}`;
  const closed = geometry.closed === true;
  const mappedType = mappedEntityType(entity.validation);

  if (scope !== CadScope.PROJECT) {
    if (/BATH|TOILET|WC/.test(text)) return CadEntityType.BATHROOM;
    if (/KITCHEN/.test(text)) return CadEntityType.KITCHEN;
    if (/STAIR/.test(text)) return CadEntityType.STAIRCASE;
    if (/GARDEN|LAWN/.test(text)) return CadEntityType.GARDEN;
    if (/DOOR/.test(text)) return CadEntityType.DOOR;
    if (/WINDOW/.test(text)) return CadEntityType.WINDOW;
    if (/ELECT|LIGHT|SWITCH|SOCKET|DB\b/.test(text)) return CadEntityType.ELECTRICAL_POINT;
    if (/PLUMB|PIPE|DRAIN|SEWER/.test(text)) return CadEntityType.PLUMBING_LINE;
    if (/WALL|COLUMN|BEAM|STRUCT/.test(text)) return CadEntityType.STRUCTURE;
    if (/PARKING|CAR/.test(text)) return CadEntityType.PARKING;
    if (/ROOM|BED|LOUNGE|DINING|HALL/.test(text) && closed) return CadEntityType.ROOM;
  } else {
    if (mappedType && mappedType !== CadEntityType.UNKNOWN) {
      if (mappedType !== CadEntityType.PLOT || closed) return mappedType;
    }
    // A topology-derived, closed cell with a valid plot identifier is stronger
    // evidence than a consultant's layer name. Shared plot boundaries are often
    // drawn on ROAD, SITE, or numeric layers in real project files.
    if (closed && isValidPlotLabel(entity.label)
      && (entity.suggestedType === CadEntityType.PLOT || entity.nativeType === "TOPOLOGY_POLYGON")) {
      return CadEntityType.PLOT;
    }
    if (/ROAD|STREET|ROW\b/.test(text)) return CadEntityType.ROAD;
    if (/PARK|GREEN|GARDEN|LANDSCAPE/.test(text)) return CadEntityType.PARK;
    if (/BOUNDARY|PERIMETER/.test(text)) return CadEntityType.BOUNDARY;
    if (/GATE|ENTRY|ENTRANCE/.test(text)) return CadEntityType.GATE;
    if (/CLUB|COMMUNITY/.test(text)) return CadEntityType.CLUBHOUSE;
    if (/DRAIN|SEWER/.test(text)) return CadEntityType.DRAINAGE;
    if (/ELECT|TRANSFORMER|RMU|MPB|HT\b|LT\b|POLE/.test(text)) return CadEntityType.ELECTRICAL_POINT;
    if (/WATER|UTILITY|PIPE|CABLE/.test(text)) return CadEntityType.UTILITY;
    if (closed && (/PLOT|PARCEL|LOT\b|SITE/.test(text) || isValidPlotLabel(entity.label))) {
      return CadEntityType.PLOT;
    }
  }

  if (entity.suggestedType) {
    return entity.suggestedType;
  }
  return CadEntityType.UNKNOWN;
}

function normalizeGeometry(input: Record<string, unknown>) {
  const geometry = structuredClone(input);
  const points = geometry.points;
  if (Array.isArray(points)) {
    const normalized = points
      .map(point2d)
      .filter((point): point is [number, number] => Boolean(point));
    if (normalized.length >= 2) {
      geometry.points = normalized;
      if (geometry.closed === true && !samePoint(normalized[0], normalized[normalized.length - 1])) {
        normalized.push([...normalized[0]] as [number, number]);
      }
    }
  }
  if (Array.isArray(geometry.point)) {
    const point = point2d(geometry.point);
    if (point) geometry.point = point;
  }
  return geometry;
}

function measureGeometry(geometry: Record<string, unknown>) {
  const points = Array.isArray(geometry.points)
    ? geometry.points.map(point2d).filter((point): point is [number, number] => Boolean(point))
    : [];
  if (points.length < 2) return {};
  const lengthCadUnits = points.slice(1).reduce(
    (total, point, index) => total + Math.hypot(point[0] - points[index][0], point[1] - points[index][1]),
    0,
  );
  if (geometry.closed !== true || points.length < 4) return { lengthCadUnits };
  let twiceArea = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    twiceArea += points[index][0] * points[index + 1][1] - points[index + 1][0] * points[index][1];
  }
  return { lengthCadUnits, areaCadUnits: Math.abs(twiceArea) / 2 };
}

function validateEntityCollection(entities: BrowserEntity[]) {
  for (const entity of entities) {
    let coordinateCount = 0;
    visitNumbers(entity.geometry, (value) => {
      coordinateCount += 1;
      if (!Number.isFinite(value) || Math.abs(value) > 1e15) {
        throwBadRequest(`CAD entity ${entity.sourceHandle} contains invalid coordinates.`);
      }
    });
    if (coordinateCount > 100_000) {
      throwBadRequest(`CAD entity ${entity.sourceHandle} is too complex to validate safely.`);
    }
  }
}

function visitNumbers(value: unknown, callback: (value: number) => void) {
  if (typeof value === "number") callback(value);
  else if (Array.isArray(value)) value.forEach((item) => visitNumbers(item, callback));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => visitNumbers(item, callback));
}

function calibrationForUnits(units?: string) {
  const normalized = units?.trim().toLowerCase();
  const unitsPerFoot: Record<string, number> = {
    feet: 1,
    foot: 1,
    inches: 12,
    inch: 12,
    millimeters: 304.8,
    millimetres: 304.8,
    centimeters: 30.48,
    centimetres: 30.48,
    meters: 0.3048,
    metres: 0.3048,
    yards: 1 / 3,
  };
  const drawingUnitsPerFoot = normalized ? unitsPerFoot[normalized] : undefined;
  return drawingUnitsPerFoot
    ? {
        source: "DXF_UNITS",
        drawingUnits: normalized,
        drawingUnitsPerFoot,
        confirmedAt: new Date().toISOString(),
      }
    : null;
}

function disciplineForScope(scope: CadScope) {
  return scope === CadScope.PROJECT ? "SITE_LAYOUT" : "ARCHITECTURAL";
}

function normalizedConfidence(entity: BrowserEntity, type: CadEntityType) {
  if (typeof entity.confidence === "number") return Math.min(1, Math.max(0, entity.confidence));
  if (type === CadEntityType.UNKNOWN) return 0.25;
  return isValidPlotLabel(entity.label) || entity.blockPath.length ? 0.88 : 0.68;
}

function mappedEntityType(validation?: Record<string, unknown>) {
  const role = typeof validation?.mappedLayerRole === "string"
    ? validation.mappedLayerRole.toUpperCase()
    : "";
  const mapping: Partial<Record<string, CadEntityType>> = {
    PLOT: CadEntityType.PLOT,
    ROAD: CadEntityType.ROAD,
    PARK: CadEntityType.PARK,
    BOUNDARY: CadEntityType.BOUNDARY,
    UTILITY: CadEntityType.UTILITY,
    DRAINAGE: CadEntityType.DRAINAGE,
    ELECTRICAL_POINT: CadEntityType.ELECTRICAL_POINT,
    GATE: CadEntityType.GATE,
    CLUBHOUSE: CadEntityType.CLUBHOUSE,
    IGNORE: CadEntityType.UNKNOWN,
    UNKNOWN: CadEntityType.UNKNOWN,
  };
  return mapping[role] ?? null;
}

function deduplicateLayers(layers: z.infer<typeof layerSchema>[]) {
  return layers.filter((layer, index, all) => all.findIndex((value) => value.name === layer.name) === index);
}

function chunkEntries(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    return typeof record.index === "number" && typeof record.storageKey === "string" && typeof record.count === "number"
      ? [{ index: record.index, storageKey: record.storageKey, count: record.count }]
      : [];
  });
}

function point2d(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || typeof value[0] !== "number" || typeof value[1] !== "number") return null;
  if (!Number.isFinite(value[0]) || !Number.isFinite(value[1])) return null;
  return [value[0], value[1]];
}

function samePoint(first: [number, number], second: [number, number]) {
  return Math.abs(first[0] - second[0]) < 1e-8 && Math.abs(first[1] - second[1]) < 1e-8;
}

function cleanLabel(value?: string | null) {
  const label = value?.replace(/\\[A-Za-z][^;]*;/g, "").replace(/[{}]/g, "").trim();
  return label ? label.slice(0, 500) : null;
}

function isValidPlotLabel(value?: string | null) {
  const label = cleanLabel(value)?.toUpperCase();
  if (!label || ["PLOT", "PLOTS", "PLOTTING", "PLOT NO.", "PLOT NO"].includes(label)) return false;
  return /^(?:EWS-\d+|COM-\d+|(?:[A-Z]{0,3}[-/]?)?\d{1,5}[A-Z]?)$/.test(label);
}

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}
