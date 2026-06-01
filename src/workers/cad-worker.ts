import { Readable } from "node:stream";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { CadEntityType, CadStatus, PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { getLocalObject, isLocalStorageKey, objectStorage } from "@/server/storage";

const require = createRequire(import.meta.url);
const DxfParser = require("dxf-parser");
const execFileAsync = promisify(execFile);

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

type CadJob = {
  cadFileId: string;
  tenantId: string;
};

type DxfEntity = {
  type?: string;
  layer?: string;
  text?: string;
  string?: string;
  vertices?: Array<{ x: number; y: number }>;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  position?: { x: number; y: number };
};

function classifyEntity(entity: DxfEntity): CadEntityType {
  const haystack = `${entity.layer ?? ""} ${entity.text ?? ""} ${entity.string ?? ""}`.toLowerCase();
  if (haystack.includes("plot") || haystack.includes("khasra")) return CadEntityType.PLOT;
  if (haystack.includes("road") || haystack.includes("street")) return CadEntityType.ROAD;
  if (haystack.includes("bound")) return CadEntityType.BOUNDARY;
  if (haystack.includes("park")) return CadEntityType.PARK;
  if (haystack.includes("gate")) return CadEntityType.GATE;
  if (haystack.includes("club") || haystack.includes("community")) return CadEntityType.CLUBHOUSE;
  if (haystack.includes("drain")) return CadEntityType.DRAINAGE;
  if (haystack.includes("electric") || haystack.includes("pole")) return CadEntityType.UTILITY;
  if (haystack.includes("water") || haystack.includes("sewer")) return CadEntityType.UTILITY;
  if (haystack.includes("bath")) return CadEntityType.BATHROOM;
  if (haystack.includes("kitchen")) return CadEntityType.KITCHEN;
  if (haystack.includes("room") || haystack.includes("bed")) return CadEntityType.ROOM;
  if (haystack.includes("garden")) return CadEntityType.GARDEN;
  return CadEntityType.UNKNOWN;
}

function geometryFor(entity: DxfEntity) {
  if (entity.vertices?.length) {
    return {
      type: "polyline",
      points: entity.vertices.map((point) => [point.x, point.y]),
      closed: isClosed(entity.vertices),
    };
  }
  if (entity.startPoint && entity.endPoint) {
    return {
      type: "line",
      points: [
        [entity.startPoint.x, entity.startPoint.y],
        [entity.endPoint.x, entity.endPoint.y],
      ],
    };
  }
  if (entity.position) {
    return {
      type: "text",
      point: [entity.position.x, entity.position.y],
      text: entity.text ?? entity.string ?? "",
    };
  }
  return { type: entity.type ?? "unknown" };
}

function isClosed(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return Math.abs(first.x - last.x) < 0.001 && Math.abs(first.y - last.y) < 0.001;
}

function polygonArea(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return 0;
  return Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
}

function calculateBounds(entities: DxfEntity[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const entity of entities) {
    for (const point of entity.vertices ?? []) {
      xs.push(point.x);
      ys.push(point.y);
    }
    if (entity.startPoint) {
      xs.push(entity.startPoint.x);
      ys.push(entity.startPoint.y);
    }
    if (entity.endPoint) {
      xs.push(entity.endPoint.x);
      ys.push(entity.endPoint.y);
    }
    if (entity.position) {
      xs.push(entity.position.x);
      ys.push(entity.position.y);
    }
  }
  return {
    minX: Math.min(...xs, 0),
    minY: Math.min(...ys, 0),
    maxX: Math.max(...xs, 0),
    maxY: Math.max(...ys, 0),
  };
}

async function getObjectBuffer(key: string) {
  if (isLocalStorageKey(key)) {
    return getLocalObject(key);
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  const result = await objectStorage.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = result.Body;
  if (!(stream instanceof Readable)) throw new Error("Unsupported object stream");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function processCad(job: CadJob) {
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: { id: job.cadFileId, tenantId: job.tenantId },
  });

  await prisma.cadFile.update({ where: { id: cadFile.id }, data: { status: cadFile.format === "DWG" ? CadStatus.CONVERTING : CadStatus.PARSING } });

  const buffer = await getObjectBuffer(cadFile.storageKey);
  const extracted = await extractWithProductionPipeline(cadFile.format, cadFile.originalName, buffer).catch(async (error) => {
    if (cadFile.format !== "DXF") throw error;
    const parsed = new DxfParser().parseSync(buffer.toString("utf8"));
    const rawEntities = (parsed.entities ?? []) as DxfEntity[];
    return {
      layers: [...new Set(rawEntities.map((entity) => entity.layer).filter(Boolean))] as string[],
      entities: rawEntities.map((entity) => ({
        layer: entity.layer,
        label: entity.text ?? entity.string ?? entity.layer ?? entity.type ?? "Entity",
        type: classifyEntity(entity),
        confidence: classifyEntity(entity) === CadEntityType.UNKNOWN ? 0.35 : 0.72,
        geometry: geometryFor(entity),
        measurements: entity.vertices && isClosed(entity.vertices) ? { areaSqft: polygonArea(entity.vertices) } : {},
        status: classifyEntity(entity) === CadEntityType.UNKNOWN ? "SUGGESTED" : "CONFIRMED",
      })),
    };
  });
  const rawEntities = extracted.entities;
  const layerNames = extracted.layers;
  const bounds = calculateExtractedBounds(rawEntities);

  await prisma.cadFile.update({ where: { id: cadFile.id }, data: { status: CadStatus.EXTRACTING } });

  const scene = await prisma.cadScene.create({
    data: {
      tenantId: job.tenantId,
      cadFileId: cadFile.id,
      scope: cadFile.parentType,
      parentId: cadFile.parentId,
      bounds,
      units: "cad-units",
      sceneJson: { source: "dxf-parser", entityCount: rawEntities.length },
    },
  });

  const layers = await Promise.all(
    layerNames.map((name) =>
      prisma.cadLayer.create({
        data: {
          tenantId: job.tenantId,
          sceneId: scene.id,
          name,
          purpose: classifyEntity({ layer: name }),
        },
      }),
    ),
  );
  const layerByName = new Map(layers.map((layer) => [layer.name, layer.id]));

  let warningCount = 0;
  const entitiesForWarnings: Array<{ id: string; label?: string | null; type: CadEntityType; geometry?: object; sourceLayer?: string | null }> = [];
  for (const entity of rawEntities) {
    const type = entity.type as CadEntityType;
    const confidence = entity.confidence ?? 0.35;

    const cadEntity = await prisma.cadEntity.create({
      data: {
        tenantId: job.tenantId,
        sceneId: scene.id,
        layerId: entity.layer ? layerByName.get(entity.layer) : undefined,
        type,
        label: entity.label,
        confidence,
        geometry: entity.geometry,
        measurements: entity.measurements,
        sourceLayer: entity.layer,
        status: entity.status ?? (confidence >= 0.7 ? "CONFIRMED" : "SUGGESTED"),
      },
    });
    entitiesForWarnings.push({
      id: cadEntity.id,
      label: cadEntity.label,
      type,
      geometry: cadEntity.geometry as object,
      sourceLayer: cadEntity.sourceLayer,
    });

    if (type === CadEntityType.UNKNOWN) {
      warningCount += 1;
      await prisma.cadReviewIssue.create({
        data: {
          tenantId: job.tenantId,
          cadFileId: cadFile.id,
          entityId: cadEntity.id,
          severity: "MEDIUM",
          code: "UNKNOWN_ENTITY",
          message: "Entity could not be confidently classified from layer/text.",
        },
      });
    }

    if (isOpenPolyline(cadEntity.geometry)) {
      warningCount += 1;
      await prisma.cadReviewIssue.create({
        data: {
          tenantId: job.tenantId,
          cadFileId: cadFile.id,
          entityId: cadEntity.id,
          severity: "LOW",
          code: "UNCLOSED_POLYLINE",
          message: "Polyline is open. Confirm before using it as a live plot or construction zone.",
        },
      });
    }

    if (type === CadEntityType.PLOT && isMissingUsefulLabel(cadEntity.label, cadEntity.sourceLayer)) {
      warningCount += 1;
      await prisma.cadReviewIssue.create({
        data: {
          tenantId: job.tenantId,
          cadFileId: cadFile.id,
          entityId: cadEntity.id,
          severity: "MEDIUM",
          code: "MISSING_PLOT_LABEL",
          message: "Plot boundary has no clear plot number. Add or correct the label before publishing.",
        },
      });
    }
  }

  for (const duplicate of duplicateLabels(entitiesForWarnings)) {
    warningCount += 1;
    await prisma.cadReviewIssue.create({
      data: {
        tenantId: job.tenantId,
        cadFileId: cadFile.id,
        entityId: duplicate.id,
        severity: "MEDIUM",
        code: "DUPLICATE_LABEL",
        message: `Duplicate CAD label "${duplicate.label}" detected. Confirm this is not the same plot/asset repeated.`,
      },
    });
  }

  await prisma.cadFile.update({
    where: { id: cadFile.id },
    data: {
      status: CadStatus.REVIEW_REQUIRED,
      processingLog: {
        parsedEntities: rawEntities.length,
        layers: layerNames.length,
        warnings: warningCount,
      },
    },
  });
}

type ExtractedEntity = {
  layer?: string;
  label?: string;
  type: string;
  confidence?: number;
  geometry: object;
  measurements?: object;
  status?: string;
};

async function extractWithProductionPipeline(format: string, originalName: string, buffer: Buffer): Promise<{ layers: string[]; entities: ExtractedEntity[] }> {
  const dir = await mkdtemp(join(tmpdir(), "kalman-cad-"));
  const sourcePath = join(dir, originalName);
  await writeFile(sourcePath, buffer);
  let extractorFormat = format;
  let extractorPath = sourcePath;

  if (format === "DWG") {
    const odaBinary = process.env.ODA_CONVERTER_BIN;
    if (!odaBinary) throw new Error("ODA_CONVERTER_BIN is not configured for DWG conversion");
    await execFileAsync(odaBinary, [dir, dir, "ACAD2018", "DXF", "0", "1"]);
    extractorPath = sourcePath.replace(/\.dwg$/i, ".dxf");
    extractorFormat = "DXF";
  }

  const python = process.env.PYTHON_BIN ?? "python3";
  const script = join(process.cwd(), "src/workers/cad-python/extract_cad.py");
  const { stdout } = await execFileAsync(python, [script, extractorPath, extractorFormat], { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout) as { layers: string[]; entities: ExtractedEntity[] };
}

function calculateExtractedBounds(entities: ExtractedEntity[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number") {
        xs.push(value[0]);
        ys.push(value[1]);
      } else value.forEach(visit);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  entities.forEach((entity) => visit(entity.geometry));
  return { minX: Math.min(...xs, 0), minY: Math.min(...ys, 0), maxX: Math.max(...xs, 0), maxY: Math.max(...ys, 0) };
}

new Worker<CadJob>(
  "cad.process",
  async (job) => {
    try {
      await processCad(job.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "CAD processing failed";
      await prisma.cadFile.updateMany({
        where: { id: job.data.cadFileId, tenantId: job.data.tenantId },
        data: {
          status: CadStatus.FAILED,
          errorMessage: message,
          processingLog: { failedAt: new Date().toISOString(), error: message },
        },
      });
      throw error;
    }
  },
  { connection: connection as never, concurrency: 2 },
);

console.log("CAD worker listening on cad.process");

function isOpenPolyline(geometry: unknown) {
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) return false;
  const value = geometry as Record<string, unknown>;
  return value.type === "polyline" && value.closed !== true && Array.isArray(value.points) && value.points.length > 2;
}

function isMissingUsefulLabel(label?: string | null, sourceLayer?: string | null) {
  if (!label) return true;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return true;
  return Boolean(sourceLayer && normalized === sourceLayer.trim().toLowerCase());
}

function duplicateLabels(entities: Array<{ id: string; label?: string | null; type: CadEntityType }>) {
  const seen = new Map<string, Array<{ id: string; label: string }>>();
  for (const entity of entities) {
    const label = entity.label?.trim();
    if (!label || entity.type === CadEntityType.UNKNOWN) continue;
    const key = `${entity.type}:${label.toLowerCase()}`;
    seen.set(key, [...(seen.get(key) ?? []), { id: entity.id, label }]);
  }
  return [...seen.values()].filter((items) => items.length > 1).flat();
}
