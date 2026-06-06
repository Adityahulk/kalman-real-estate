import "@/server/load-env";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { CadEntityType, CadStatus, InsightSeverity, Prisma, PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { getObjectResilient, putObjectResilient, storageKey } from "@/server/storage";

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

type CadJob = {
  cadFileId: string;
  tenantId: string;
  mode?: "inspect" | "extract";
};

type ExtractedLayer = {
  name: string;
  purpose?: string;
  color?: string;
  metadata?: Record<string, unknown>;
};

type ExtractedEntity = {
  layer?: string;
  label?: string;
  type: string;
  confidence?: number;
  geometry: Record<string, unknown>;
  measurements?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  status?: string;
  sourceHandle?: string;
};

type ExtractionResult = {
  analysis?: Record<string, unknown> & {
    previewArtifact?: string;
    recognitionArtifact?: string;
  };
  layers: Array<string | ExtractedLayer>;
  entities: ExtractedEntity[];
};

type AnalysisWriteData = {
  discipline: string;
  sourceKind?: string;
  pageNumber: number;
  proposedRegion?: Prisma.InputJsonValue;
  excludedRegions?: Prisma.InputJsonValue;
  expectedCounts?: Prisma.InputJsonValue;
  inspection?: Prisma.InputJsonValue;
  scaleCalibration?: Prisma.InputJsonValue;
  calibrationConfirmedAt?: Date;
  previewArtifactKey?: string;
  rawArtifactKey: string;
};

async function processCad(job: CadJob) {
  const mode = job.mode ?? "inspect";
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: { id: job.cadFileId, tenantId: job.tenantId },
    include: { analysis: true },
  });
  const status = mode === "inspect"
    ? cadFile.format === "DWG" ? CadStatus.CONVERTING : CadStatus.ANALYZING
    : CadStatus.EXTRACTING;
  await prisma.cadFile.update({ where: { id: cadFile.id }, data: { status, errorMessage: null } });

  const buffer = await getObjectResilient(cadFile.storageKey);
  const working = await runCadIntelligence(cadFile.format, cadFile.originalName, buffer, mode, cadFile.analysis);
  try {
    const artifactKeys = await persistArtifacts(job, cadFile.id, working.dir, working.result);
    const rawArtifact = await persistRawArtifact(job, cadFile.id, mode, working.result);
    const analysisData = analysisWriteData(working.result.analysis ?? {}, artifactKeys, rawArtifact);

    if (mode === "inspect") {
      await prisma.$transaction([
        prisma.cadAnalysis.upsert({
          where: { cadFileId: cadFile.id },
          update: analysisData,
          create: {
            tenantId: job.tenantId,
            cadFileId: cadFile.id,
            ...analysisData,
          },
        }),
        prisma.cadFile.update({
          where: { id: cadFile.id },
          data: {
            status: CadStatus.SETUP_REQUIRED,
            processingLog: {
              mode,
              inspectedAt: new Date().toISOString(),
              sourceKind: stringValue(working.result.analysis?.sourceKind),
              discipline: stringValue(working.result.analysis?.discipline),
            },
          },
        }),
      ]);
      return;
    }

    await persistCandidates(job, cadFile.id, working.result, analysisData);
  } finally {
    await rm(working.dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function persistCandidates(
  job: CadJob,
  cadFileId: string,
  result: ExtractionResult,
  analysisData: AnalysisWriteData,
) {
  const rawEntities = result.entities;
  if (!rawEntities.length) {
    throw new Error("No safe business candidates were extracted. Adjust the drawing region or upload a cleaner DXF/PDF.");
  }
  const bounds = calculateBounds(rawEntities);
  const layerValues = normalizeLayers(result.layers);

  await prisma.$transaction(async (tx) => {
    const analysis = await tx.cadAnalysis.update({
      where: { cadFileId },
      data: analysisData,
    });
    const oldScenes = await tx.cadScene.findMany({
      where: { tenantId: job.tenantId, cadFileId },
      select: { id: true, entities: { select: { id: true } } },
    });
    const oldSceneIds = oldScenes.map((scene) => scene.id);
    const oldEntityIds = oldScenes.flatMap((scene) => scene.entities.map((entity) => entity.id));
    if (oldEntityIds.length) {
      await tx.spatialLink.deleteMany({ where: { tenantId: job.tenantId, cadEntityId: { in: oldEntityIds } } });
      await tx.cadEntity.deleteMany({ where: { tenantId: job.tenantId, id: { in: oldEntityIds } } });
    }
    if (oldSceneIds.length) {
      await tx.cadLayer.deleteMany({ where: { tenantId: job.tenantId, sceneId: { in: oldSceneIds } } });
      await tx.cadScene.deleteMany({ where: { tenantId: job.tenantId, id: { in: oldSceneIds } } });
    }
    await tx.cadReviewIssue.deleteMany({ where: { tenantId: job.tenantId, cadFileId } });

    const scene = await tx.cadScene.create({
      data: {
        tenantId: job.tenantId,
        cadFileId,
        scope: (await tx.cadFile.findUniqueOrThrow({ where: { id: cadFileId } })).parentType,
        parentId: (await tx.cadFile.findUniqueOrThrow({ where: { id: cadFileId } })).parentId,
        bounds,
        units: "drawing-space",
        sceneJson: {
          source: "cad-intelligence-v2",
          entityCount: rawEntities.length,
          previewArtifactKey: analysis.previewArtifactKey,
          rawArtifactKey: analysis.rawArtifactKey,
          expectedCounts: analysis.expectedCounts,
          scaleCalibration: analysis.scaleCalibration,
        },
      },
    });

    const layers = [];
    for (const layer of layerValues) {
      layers.push(await tx.cadLayer.create({
        data: {
          tenantId: job.tenantId,
          sceneId: scene.id,
          name: layer.name,
          purpose: layer.purpose,
          color: layer.color,
          metadata: jsonInput(layer.metadata),
        },
      }));
    }
    const layerByName = new Map(layers.map((layer) => [layer.name, layer.id]));
    const created: Array<{ id: string; label: string | null; type: CadEntityType; validation: Prisma.JsonValue | null }> = [];

    for (const entity of rawEntities) {
      const type = parseEntityType(entity.type);
      const candidate = await tx.cadEntity.create({
        data: {
          tenantId: job.tenantId,
          sceneId: scene.id,
          layerId: entity.layer ? layerByName.get(entity.layer) : undefined,
          type,
          label: entity.label?.slice(0, 500),
          confidence: clamp(entity.confidence ?? 0.35),
          geometry: entity.geometry as Prisma.InputJsonValue,
          measurements: jsonInput(entity.measurements),
          validation: jsonInput(entity.validation),
          sourceHandle: entity.sourceHandle,
          sourceLayer: entity.layer,
          status: "SUGGESTED",
        },
      });
      created.push({ id: candidate.id, label: candidate.label, type, validation: candidate.validation });
      await createEntityIssues(tx, job.tenantId, cadFileId, candidate);
    }

    await createAggregateIssues(tx, job.tenantId, cadFileId, created, analysis.expectedCounts);
    const blockingCount = await tx.cadReviewIssue.count({
      where: { tenantId: job.tenantId, cadFileId, blocking: true, resolved: false },
    });
    const requiresCalibration = created.some((entity) => entity.type === CadEntityType.PLOT)
      && !analysis.calibrationConfirmedAt;
    await tx.cadFile.update({
      where: { id: cadFileId },
      data: {
        status: requiresCalibration ? CadStatus.CALIBRATION_REQUIRED : CadStatus.REVIEW_REQUIRED,
        errorMessage: null,
        processingLog: {
          mode: "extract",
          extractedAt: new Date().toISOString(),
          candidateCount: created.length,
          plotCandidateCount: created.filter((entity) => entity.type === CadEntityType.PLOT).length,
          blockingIssueCount: blockingCount,
        },
      },
    });
  }, { timeout: 180_000 });
}

async function createEntityIssues(
  tx: Prisma.TransactionClient,
  tenantId: string,
  cadFileId: string,
  entity: { id: string; type: CadEntityType; label: string | null; geometry: Prisma.JsonValue; validation: Prisma.JsonValue | null },
) {
  const issues: Array<{ severity: InsightSeverity; code: string; message: string; blocking: boolean; metadata?: Prisma.InputJsonValue }> = [];
  if (entity.type === CadEntityType.PLOT) {
    if (!isValidPlotLabel(entity.label)) {
      issues.push(entity.label
        ? { severity: InsightSeverity.CRITICAL, code: "INVALID_PLOT_LABEL", message: "Plot number is not a valid unique plot identifier.", blocking: true }
        : { severity: InsightSeverity.CRITICAL, code: "MISSING_PLOT_LABEL", message: "A likely plot boundary was found, but its plot number could not be read. Enter the correct plot number before publishing.", blocking: true });
    }
    if (!isClosedGeometry(entity.geometry)) {
      issues.push({ severity: InsightSeverity.CRITICAL, code: "UNCLOSED_PLOT", message: "Plot boundary is not closed.", blocking: true });
    }
  }
  for (const code of validationBlockingCodes(entity.validation)) {
    issues.push({
      severity: code === "SCALE_REQUIRED" ? InsightSeverity.HIGH : InsightSeverity.MEDIUM,
      code,
      message: issueMessage(code),
      blocking: code !== "DUPLICATE_OCR_LABEL",
    });
  }
  for (const issue of issues) {
    await tx.cadReviewIssue.create({
      data: { tenantId, cadFileId, entityId: entity.id, ...issue },
    });
  }
}

async function createAggregateIssues(
  tx: Prisma.TransactionClient,
  tenantId: string,
  cadFileId: string,
  entities: Array<{ id: string; label: string | null; type: CadEntityType }>,
  expectedCounts: Prisma.JsonValue | null,
) {
  const plotEntities = entities.filter((entity) => entity.type === CadEntityType.PLOT);
  const labels = new Map<string, string[]>();
  for (const entity of plotEntities) {
    const label = entity.label?.trim().toUpperCase();
    if (!label) continue;
    labels.set(label, [...(labels.get(label) ?? []), entity.id]);
  }
  for (const [label, ids] of labels) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      await tx.cadReviewIssue.create({
        data: {
          tenantId,
          cadFileId,
          entityId: id,
          severity: InsightSeverity.CRITICAL,
          code: "DUPLICATE_PLOT_LABEL",
          message: `Plot number ${label} appears more than once.`,
          blocking: true,
        },
      });
    }
  }
  const expected = numberFromJson(expectedCounts, "total");
  if (expected && expected !== plotEntities.length) {
    await tx.cadReviewIssue.create({
      data: {
        tenantId,
        cadFileId,
        severity: InsightSeverity.CRITICAL,
        code: "PLOT_COUNT_MISMATCH",
        message: `The drawing states ${expected} plots, but ${plotEntities.length} safe plot candidates were detected.`,
        blocking: true,
        metadata: { expected, detected: plotEntities.length },
      },
    });
  }
}

async function runCadIntelligence(
  format: string,
  originalName: string,
  buffer: Buffer,
  mode: "inspect" | "extract",
  analysis: Prisma.CadAnalysisGetPayload<Record<string, never>> | null,
) {
  const dir = await mkdtemp(join(tmpdir(), "kalman-cad-v2-"));
  try {
    const safeName = basename(originalName).replace(/[^a-zA-Z0-9._ -]/g, "-") || (format === "VECTOR_PDF" ? "plan.pdf" : "plan.dxf");
    const sourcePath = join(dir, safeName);
    await writeFile(sourcePath, buffer);
    let extractorFormat = format;
    let extractorPath = sourcePath;
    if (format === "DWG") {
      const odaBinary = process.env.ODA_CONVERTER_BIN;
      if (!odaBinary) throw new Error("DWG conversion is not configured. Export the drawing as DXF.");
      await execFileAsync(odaBinary, [dir, dir, "ACAD2018", "DXF", "0", "1"]);
      extractorPath = sourcePath.replace(/\.dwg$/i, ".dxf");
      extractorFormat = "DXF";
    }
    const optionsPath = join(dir, "options.json");
    await writeFile(optionsPath, JSON.stringify({ analysis: serializeAnalysis(analysis) }));
    const script = join(process.cwd(), "src/workers/cad-python/cad_intelligence.py");
    const { stdout } = await execFileAsync(process.env.PYTHON_BIN ?? "python3", [
      script,
      extractorPath,
      extractorFormat,
      mode,
      optionsPath,
      dir,
    ], {
      maxBuffer: Number(process.env.CAD_EXTRACTOR_MAX_OUTPUT_MB ?? 100) * 1024 * 1024,
      timeout: Number(process.env.CAD_EXTRACTION_TIMEOUT_MS ?? 900_000),
    });
    const result = JSON.parse(stdout) as ExtractionResult;
    if (!Array.isArray(result.layers) || !Array.isArray(result.entities)) {
      throw new Error("CAD intelligence worker returned an invalid result");
    }
    return { result, dir };
  } catch (error) {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function persistArtifacts(job: CadJob, cadFileId: string, dir: string, result: ExtractionResult) {
  const output: { previewArtifactKey?: string; recognitionArtifactKey?: string } = {};
  for (const [field, name] of [
    ["previewArtifactKey", result.analysis?.previewArtifact],
    ["recognitionArtifactKey", result.analysis?.recognitionArtifact],
  ] as const) {
    if (!name) continue;
    const path = join(dir, basename(name));
    const bytes = await readFile(path).catch(() => null);
    if (!bytes) continue;
    const key = storageKey([job.tenantId, "cad", cadFileId, "artifacts", `${Date.now()}-${basename(name)}`]);
    const stored = await putObjectResilient(key, bytes, name.endsWith(".png") ? "image/png" : "image/jpeg", { mirrorLocalOnS3Success: true });
    output[field] = stored.storageKey;
  }
  return output;
}

async function persistRawArtifact(job: CadJob, cadFileId: string, mode: string, result: ExtractionResult) {
  const key = storageKey([job.tenantId, "cad", cadFileId, "artifacts", `${Date.now()}-${mode}.json`]);
  const stored = await putObjectResilient(key, Buffer.from(JSON.stringify(result)), "application/json", { mirrorLocalOnS3Success: true });
  return stored.storageKey;
}

function analysisWriteData(
  analysis: Record<string, unknown>,
  artifacts: { previewArtifactKey?: string; recognitionArtifactKey?: string },
  rawArtifactKey: string,
): AnalysisWriteData {
  const inspection = objectValue(analysis.inspection);
  if (artifacts.recognitionArtifactKey) inspection.recognitionArtifactKey = artifacts.recognitionArtifactKey;
  return {
    discipline: stringValue(analysis.discipline) ?? "AUTO",
    sourceKind: stringValue(analysis.sourceKind),
    pageNumber: numberValue(analysis.pageNumber) ?? 1,
    proposedRegion: jsonInput(analysis.proposedRegion),
    excludedRegions: jsonInput(analysis.excludedRegions),
    expectedCounts: jsonInput(analysis.expectedCounts),
    inspection: jsonInput(inspection),
    scaleCalibration: jsonInput(analysis.scaleCalibration),
    calibrationConfirmedAt: analysis.calibrationConfirmed === true || analysis.calibrationConfirmedAt
      ? dateValue(analysis.calibrationConfirmedAt) ?? new Date()
      : undefined,
    previewArtifactKey: artifacts.previewArtifactKey,
    rawArtifactKey,
  };
}

function serializeAnalysis(analysis: Prisma.CadAnalysisGetPayload<Record<string, never>> | null) {
  if (!analysis) return {};
  return {
    discipline: analysis.discipline,
    sourceKind: analysis.sourceKind,
    pageNumber: analysis.pageNumber,
    proposedRegion: analysis.proposedRegion,
    confirmedRegion: analysis.confirmedRegion,
    excludedRegions: analysis.excludedRegions,
    expectedCounts: analysis.expectedCounts,
    scaleCalibration: analysis.scaleCalibration,
    calibrationConfirmedAt: analysis.calibrationConfirmedAt,
    inspection: analysis.inspection,
  };
}

function normalizeLayers(layers: Array<string | ExtractedLayer>) {
  const seen = new Set<string>();
  return layers.map((layer) => typeof layer === "string" ? { name: layer } : layer).filter((layer) => {
    if (!layer.name || seen.has(layer.name)) return false;
    seen.add(layer.name);
    return true;
  });
}

function calculateBounds(entities: ExtractedEntity[]) {
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
  if (!xs.length || !ys.length) throw new Error("Extracted candidates have no usable coordinates");
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function parseEntityType(value: string) {
  return Object.values(CadEntityType).includes(value as CadEntityType) ? value as CadEntityType : CadEntityType.UNKNOWN;
}

function validationBlockingCodes(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const codes = (value as Record<string, unknown>).blockingCodes;
  return Array.isArray(codes) ? codes.filter((code): code is string => typeof code === "string") : [];
}

function isClosedGeometry(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const geometry = value as Record<string, unknown>;
  return geometry.closed === true && Array.isArray(geometry.points) && geometry.points.length >= 4;
}

function isValidPlotLabel(label: string | null) {
  if (!label || label.startsWith("\\")) return false;
  const normalized = label.trim().toUpperCase();
  if (["PLOT", "PLOTS", "PLOTTING", "PLOT NO.", "PLOT NO"].includes(normalized)) return false;
  return /^(?:[A-Z]{0,2}[-/]?)?\d{1,4}[A-Z]?$/.test(normalized);
}

function issueMessage(code: string) {
  if (code === "SCALE_REQUIRED") return "Confirm drawing scale before plot measurements can be published.";
  if (code === "DUPLICATE_OCR_LABEL") return "OCR found this number more than once. Confirm the correct plot cell.";
  return `Candidate validation requires review: ${code.replaceAll("_", " ").toLowerCase()}.`;
}

function numberFromJson(value: Prisma.JsonValue | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result = (value as Record<string, unknown>)[key];
  return typeof result === "number" ? result : undefined;
}

function jsonInput(value: unknown) {
  return value === undefined || value === null ? undefined : value as Prisma.InputJsonValue;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value as Record<string, unknown> } : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

new Worker<CadJob>(
  "cad.process",
  async (job) => {
    try {
      await processCad(job.data);
    } catch (error) {
      const message = extractionErrorMessage(error);
      await prisma.cadFile.updateMany({
        where: { id: job.data.cadFileId, tenantId: job.data.tenantId },
        data: {
          status: CadStatus.FAILED,
          errorMessage: message,
          processingLog: { failedAt: new Date().toISOString(), mode: job.data.mode ?? "inspect", error: message },
        },
      });
      throw error;
    }
  },
  { connection: connection as never, concurrency: 1 },
);

console.log("CAD intelligence worker listening on cad.process");

function extractionErrorMessage(error: unknown) {
  const value = error as { stderr?: unknown; message?: unknown };
  const stderr = typeof value?.stderr === "string" ? value.stderr : "";
  const runtimeLine = stderr.split(/\r?\n/).map((line) => line.trim()).reverse().find((line) => line.startsWith("RuntimeError:"));
  if (runtimeLine) return runtimeLine.replace(/^RuntimeError:\s*/, "");
  if (typeof value?.message === "string") {
    if (value.message.includes("timed out")) return "CAD extraction timed out. Reduce the drawing region or split the drawing and retry.";
    return value.message.split(/\r?\n/)[0];
  }
  return "CAD extraction failed";
}
