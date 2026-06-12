import "@/server/load-env";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir, totalmem } from "node:os";
import { promisify } from "node:util";
import { CadEntityType, CadFormat, CadStatus, InsightSeverity, Prisma, PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { getObjectResilient, putObjectResilient, storageKey } from "@/server/storage";
import { inspectPdf, extractPdf } from "@/server/services/cad-pdf";
import { geminiAvailable } from "@/server/services/gemini-vision";

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
  label?: string | null;
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

type CadProgress = {
  stage: string;
  label: string;
  timestamp?: string;
};

class CadProcessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details: { exitCode?: number | null; signal?: NodeJS.Signals | null; diagnosticTail?: string[] } = {},
  ) {
    super(message);
    this.name = "CadProcessError";
  }
}

async function processCad(job: CadJob) {
  const startedAt = new Date();
  const mode = job.mode ?? "inspect";
  const cadFile = await prisma.cadFile.findFirstOrThrow({
    where: { id: job.cadFileId, tenantId: job.tenantId },
    include: { analysis: true },
  });
  if (cadFile.format === CadFormat.DXF || cadFile.format === CadFormat.DWG) {
    await prisma.cadFile.update({
      where: { id: cadFile.id },
      data: {
        status: CadStatus.UPLOADED,
        errorMessage: null,
        processingLog: {
          parserEngine: "mlightcad-browser",
          stage: "WAITING_FOR_BROWSER",
          progressLabel: "Open this drawing to parse and visualize it in your browser.",
          redirectedFromWorkerAt: new Date().toISOString(),
        },
      },
    });
    return;
  }
  await assertWorkerCapacity();
  const status = mode === "inspect"
    ? CadStatus.ANALYZING
    : CadStatus.EXTRACTING;
  await prisma.cadFile.update({
    where: { id: cadFile.id },
    data: {
      status,
      errorMessage: null,
      processingLog: {
        mode,
        stage: "loading_file",
        progressLabel: "Loading the stored drawing",
        startedAt: startedAt.toISOString(),
        heartbeatAt: startedAt.toISOString(),
        elapsedMs: 0,
      },
    },
  });

  const buffer = await getObjectResilient(cadFile.storageKey);

  const useNewPipeline = cadFile.format === CadFormat.VECTOR_PDF && geminiAvailable();

  if (useNewPipeline) {
    await updateProgress(job, startedAt, "processing", "Analyzing with AI");
    let result;
    if (mode === "inspect") {
      result = await inspectPdf(buffer, cadFile.originalName);
    } else {
      const analysis = serializeAnalysis(cadFile.analysis);
      result = await extractPdf(buffer, cadFile.originalName, analysis);
    }

    const rawArtifact = await persistRawArtifact(job, cadFile.id, mode, result);
    const analysisData = analysisWriteData(result.analysis ?? {}, {}, rawArtifact);

    if (mode === "inspect") {
      await prisma.$transaction([
        prisma.cadAnalysis.upsert({
          where: { cadFileId: cadFile.id },
          update: analysisData,
          create: { tenantId: job.tenantId, cadFileId: cadFile.id, ...analysisData },
        }),
        prisma.cadFile.update({
          where: { id: cadFile.id },
          data: {
            status: CadStatus.SETUP_REQUIRED,
            processingLog: {
              mode,
              inspectedAt: new Date().toISOString(),
              sourceKind: stringValue(result.analysis?.sourceKind),
              discipline: stringValue(result.analysis?.discipline),
              pipeline: "v2",
            },
          },
        }),
      ]);
      return;
    }

    await persistCandidates(job, cadFile.id, result, analysisData);
    return;
  }

  const working = await runCadIntelligence(
    job,
    cadFile.format,
    cadFile.originalName,
    buffer,
    mode,
    cadFile.analysis,
    startedAt,
  );
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

async function updateProgress(job: CadJob, startedAt: Date, stage: string, label: string) {
  await prisma.cadFile.updateMany({
    where: { id: job.cadFileId, tenantId: job.tenantId },
    data: {
      processingLog: {
        mode: job.mode ?? "inspect",
        stage,
        progressLabel: label,
        startedAt: startedAt.toISOString(),
        heartbeatAt: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt.getTime(),
        pipeline: "v2",
      },
    },
  });
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
  job: CadJob,
  format: string,
  originalName: string,
  buffer: Buffer,
  mode: "inspect" | "extract",
  analysis: Prisma.CadAnalysisGetPayload<Record<string, never>> | null,
  startedAt: Date,
) {
  const dir = await mkdtemp(join(tmpdir(), "kalman-cad-v2-"));
  try {
    const safeName = basename(originalName).replace(/[^a-zA-Z0-9._ -]/g, "-") || (format === "VECTOR_PDF" ? "plan.pdf" : "plan.dxf");
    const sourcePath = join(dir, safeName);
    await writeFile(sourcePath, buffer);
    const optionsPath = join(dir, "options.json");
    await writeFile(optionsPath, JSON.stringify({ analysis: serializeAnalysis(analysis) }));
    const script = join(process.cwd(), "src/workers/cad-python/cad_intelligence.py");
    const stdout = await runPythonExtractor(job, startedAt, process.env.PYTHON_BIN ?? "python3", [
      script,
      sourcePath,
      format,
      mode,
      optionsPath,
      dir,
    ]);
    let result: ExtractionResult;
    try {
      result = JSON.parse(stdout) as ExtractionResult;
    } catch {
      throw new CadProcessError("Map intelligence worker returned unreadable output.", "INVALID_WORKER_OUTPUT");
    }
    if (!Array.isArray(result.layers) || !Array.isArray(result.entities)) {
      throw new CadProcessError("Map intelligence worker returned an invalid result.", "INVALID_WORKER_OUTPUT");
    }
    return { result, dir };
  } catch (error) {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function runPythonExtractor(job: CadJob, startedAt: Date, command: string, args: string[]) {
  const maxOutputBytes = Number(process.env.CAD_EXTRACTOR_MAX_OUTPUT_MB ?? 100) * 1024 * 1024;
  const timeoutMs = Number(process.env.CAD_EXTRACTION_TIMEOUT_MS ?? 1_800_000);
  const diagnosticTail: string[] = [];
  let stderrBuffer = "";
  let outputBytes = 0;
  let timedOut = false;
  let outputExceeded = false;
  let progressWrites = Promise.resolve();
  let currentProgress: CadProgress = { stage: "loading_drawing", label: "Loading drawing" };

  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      OMP_NUM_THREADS: "1",
      OPENBLAS_NUM_THREADS: "1",
      MKL_NUM_THREADS: "1",
      NUMEXPR_NUM_THREADS: "1",
      VECLIB_MAXIMUM_THREADS: "1",
    },
  });
  const stdoutChunks: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => {
    outputBytes += chunk.length;
    if (outputBytes > maxOutputBytes) {
      outputExceeded = true;
      child.kill("SIGKILL");
      return;
    }
    stdoutChunks.push(chunk);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString("utf8");
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("CAD_PROGRESS ")) {
        try {
          const progress = JSON.parse(trimmed.slice("CAD_PROGRESS ".length)) as CadProgress;
          currentProgress = progress;
          progressWrites = progressWrites.then(() => persistCadProgress(job, startedAt, progress));
        } catch {
          appendDiagnostic(diagnosticTail, trimmed);
        }
      } else {
        appendDiagnostic(diagnosticTail, sanitizeDiagnostic(trimmed));
      }
    }
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
  }, timeoutMs);
  const heartbeat = setInterval(() => {
    progressWrites = progressWrites.then(() => persistCadProgress(job, startedAt, currentProgress));
  }, 15_000);

  const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  }).finally(() => {
    clearTimeout(timeout);
    clearInterval(heartbeat);
  });
  if (stderrBuffer.trim()) appendDiagnostic(diagnosticTail, sanitizeDiagnostic(stderrBuffer.trim()));
  await progressWrites.catch(() => undefined);

  if (timedOut) {
    throw new CadProcessError("Map processing exceeded the allowed processing time.", "EXTRACTION_TIMEOUT", {
      ...result,
      diagnosticTail,
    });
  }
  if (outputExceeded) {
    throw new CadProcessError("Map extraction produced more data than the worker can safely process.", "OUTPUT_LIMIT", {
      ...result,
      diagnosticTail,
    });
  }
  if (result.exitCode !== 0) {
    throw new CadProcessError("Map extraction process exited unexpectedly.", classifyExitFailure(result.signal, diagnosticTail), {
      ...result,
      diagnosticTail,
    });
  }
  return Buffer.concat(stdoutChunks).toString("utf8");
}

async function persistCadProgress(job: CadJob, startedAt: Date, progress: CadProgress) {
  const heartbeatAt = new Date();
  await prisma.cadFile.updateMany({
    where: { id: job.cadFileId, tenantId: job.tenantId },
    data: {
      processingLog: {
        mode: job.mode ?? "inspect",
        stage: progress.stage,
        progressLabel: progress.label,
        startedAt: startedAt.toISOString(),
        heartbeatAt: heartbeatAt.toISOString(),
        elapsedMs: heartbeatAt.getTime() - startedAt.getTime(),
      },
    },
  });
}

function appendDiagnostic(lines: string[], line: string) {
  if (!line) return;
  lines.push(line.slice(0, 1_000));
  if (lines.length > 20) lines.splice(0, lines.length - 20);
}

function sanitizeDiagnostic(value: string) {
  return value
    .replace(/\/tmp\/kalman-cad-v2-[^\s/'"]+/g, "[temporary-file]")
    .replace(/\/app\/src\/workers\/cad-python\/cad_intelligence\.py/g, "Map extractor");
}

function classifyExitFailure(signal: NodeJS.Signals | null, diagnostics: string[]) {
  const text = diagnostics.join("\n").toLowerCase();
  if (signal === "SIGKILL" || text.includes("out of memory") || text.includes("cannot allocate memory")) return "MEMORY_LIMIT";
  if (text.includes("libgl.so") || text.includes("no module named") || text.includes("importerror")) return "DEPENDENCY_MISSING";
  if (text.includes("cannot open broken document") || text.includes("filedataerror") || text.includes("syntaxerror")) return "INVALID_DRAWING";
  if (text.includes("does not intersect") || text.includes("no safe business candidates")) return "DRAWING_REGION_EMPTY";
  return "EXTRACTOR_FAILED";
}

async function workerMemory() {
  const cgroupPath = "/sys/fs/cgroup/memory.max";
  const value = await readFile(cgroupPath, "utf8").catch(() => "max");
  const trimmed = value.trim();
  const limitBytes = trimmed && trimmed !== "max" && Number.isFinite(Number(trimmed))
    ? Number(trimmed)
    : totalmem();
  return {
    limitBytes,
    limitMb: Math.round(limitBytes / 1024 / 1024),
    minimumMb: Number(process.env.CAD_MIN_MEMORY_MB ?? 2_800),
  };
}

async function assertWorkerCapacity() {
  const memory = await workerMemory();
  if (memory.limitMb < memory.minimumMb) {
    throw new CadProcessError(
      `Map processing requires at least ${memory.minimumMb} MB of worker memory; this container has ${memory.limitMb} MB.`,
      "INSUFFICIENT_MEMORY",
    );
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
      const failure = extractionFailure(error);
      const previous = await prisma.cadFile.findFirst({
        where: { id: job.data.cadFileId, tenantId: job.data.tenantId },
        select: { processingLog: true },
      });
      const previousLog = jsonObject(previous?.processingLog);
      const startedAt = typeof previousLog.startedAt === "string" ? new Date(previousLog.startedAt) : null;
      const failedAt = new Date();
      await prisma.cadFile.updateMany({
        where: { id: job.data.cadFileId, tenantId: job.data.tenantId },
        data: {
          status: CadStatus.FAILED,
          errorMessage: failure.message,
          processingLog: {
            startedAt: startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt.toISOString() : undefined,
            failedAt: failedAt.toISOString(),
            heartbeatAt: failedAt.toISOString(),
            elapsedMs: startedAt && !Number.isNaN(startedAt.getTime()) ? failedAt.getTime() - startedAt.getTime() : undefined,
            mode: job.data.mode ?? "inspect",
            stage: "failed",
            progressLabel: "Map processing stopped",
            failureCode: failure.code,
            exitCode: failure.exitCode,
            signal: failure.signal,
            diagnosticTail: failure.diagnosticTail,
          },
        },
      });
      throw error;
    }
  },
  { connection: connection as never, concurrency: 1 },
);

const initialHealth = await cadWorkerHealth();
await connection.set("kalman:cad-worker:health", JSON.stringify(initialHealth), "EX", 120);
setInterval(async () => {
  await connection.set("kalman:cad-worker:health", JSON.stringify(await cadWorkerHealth()), "EX", 120).catch(() => undefined);
}, 60_000).unref();

console.log("Map intelligence worker listening on cad.process", initialHealth);

function extractionFailure(error: unknown) {
  if (error instanceof CadProcessError) {
    return {
      code: error.code,
      message: failureMessage(error.code, error.message),
      exitCode: error.details.exitCode,
      signal: error.details.signal,
      diagnosticTail: error.details.diagnosticTail ?? [],
    };
  }
  const value = error as { stderr?: unknown; message?: unknown; code?: unknown };
  const stderr = typeof value?.stderr === "string" ? value.stderr : "";
  const diagnostics = stderr.split(/\r?\n/).map((line) => sanitizeDiagnostic(line.trim())).filter(Boolean).slice(-20);
  const rawMessage = typeof value?.message === "string" ? value.message : "";
  let code = typeof value?.code === "string" && value.code === "ENOENT" ? "DEPENDENCY_MISSING" : "EXTRACTOR_FAILED";
  if (rawMessage.includes("No safe business candidates") || rawMessage.includes("does not intersect")) code = "DRAWING_REGION_EMPTY";
  if (rawMessage.includes("invalid result") || rawMessage.includes("unreadable output")) code = "INVALID_WORKER_OUTPUT";
  if (typeof value?.message === "string") {
    if (value.message.includes("timed out")) {
      return { code: "EXTRACTION_TIMEOUT", message: failureMessage("EXTRACTION_TIMEOUT"), diagnosticTail: diagnostics };
    }
  }
  return { code, message: failureMessage(code), diagnosticTail: diagnostics };
}

function failureMessage(code: string, fallback?: string) {
  if (code === "INSUFFICIENT_MEMORY") return fallback ?? "The Map worker does not have enough memory for this drawing.";
  if (code === "MEMORY_LIMIT") return "The Map worker reached its memory limit. Increase worker memory or reduce the confirmed drawing region, then retry.";
  if (code === "EXTRACTION_TIMEOUT") return "Map processing took longer than the configured limit. Retry after confirming a tighter drawing region.";
  if (code === "DEPENDENCY_MISSING") return "The Map worker is missing a required PDF/OCR dependency. Rebuild the Map worker image and retry.";
  if (code === "INVALID_DRAWING") return "The PDF is corrupt, encrypted, or unsupported. Export an unlocked vector or mixed PDF and retry.";
  if (code === "DRAWING_REGION_EMPTY") return "No usable site drawing was found in the confirmed region. Adjust the drawing region and retry.";
  if (code === "OUTPUT_LIMIT") return "The drawing produced too much extraction data. Reduce the drawing region or split the plan and retry.";
  if (code === "INVALID_WORKER_OUTPUT") return "The Map worker completed but returned an invalid result. Rebuild the Map worker image and retry.";
  return "Map processing failed inside the extraction worker. Review the worker diagnostics and retry.";
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function cadWorkerHealth() {
  const python = process.env.PYTHON_BIN ?? "python3";
  const dependency = await execFileAsync(python, ["-c", "import fitz, cv2, paddleocr, ezdxf, shapely"]).then(
    () => ({ ok: true as const }),
    (error) => ({ ok: false as const, error: sanitizeDiagnostic(error instanceof Error ? error.message : "Dependency check failed") }),
  );
  const tesseract = await execFileAsync(process.env.TESSERACT_BIN ?? "tesseract", ["--version"]).then(
    () => ({ ok: true as const }),
    (error) => ({ ok: false as const, error: sanitizeDiagnostic(error instanceof Error ? error.message : "Tesseract check failed") }),
  );
  const memory = await workerMemory();
  const paddleHome = join(process.env.HOME ?? "/app", ".paddleocr");
  return {
    ready: dependency.ok && tesseract.ok && memory.limitMb >= memory.minimumMb,
    checkedAt: new Date().toISOString(),
    dependencies: {
      pythonCadStack: dependency,
      tesseract,
      paddleModels: { ok: existsSync(paddleHome), path: paddleHome },
    },
    memory,
  };
}
