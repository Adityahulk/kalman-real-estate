import { CadFormat, CadStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getObjectResilient } from "../storage";
import { geminiAvailable } from "./gemini-vision";

type CadPdfMode = "inspect" | "extract";

type ScheduleResult =
  | { scheduled: true; queued: true; reason: "background_processing" }
  | { scheduled: false; queued: false; reason: string };

const activeJobs = new Set<string>();

function jobKey(cadFileId: string, mode: CadPdfMode) {
  return `${cadFileId}:${mode}`;
}

export function scheduleCadPdfProcessing(opts: {
  tenantId: string;
  cadFileId: string;
  mode: CadPdfMode;
}): ScheduleResult {
  if (!geminiAvailable()) {
    return { scheduled: false, queued: false, reason: "GEMINI_API_KEY required for PDF maps" };
  }

  const key = jobKey(opts.cadFileId, opts.mode);
  if (activeJobs.has(key)) {
    return { scheduled: true, queued: true, reason: "background_processing" };
  }

  activeJobs.add(key);
  void runCadPdfProcessing(opts)
    .catch((error) => {
      console.error("CAD PDF background processing failed", opts, error);
    })
    .finally(() => {
      activeJobs.delete(key);
    });

  return { scheduled: true, queued: true, reason: "background_processing" };
}

async function runCadPdfProcessing(opts: {
  tenantId: string;
  cadFileId: string;
  mode: CadPdfMode;
}) {
  const startedAt = new Date();
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: opts.cadFileId, tenantId: opts.tenantId },
    include: { analysis: true },
  });
  if (!cadFile) return;
  if (cadFile.format !== CadFormat.VECTOR_PDF) return;

  const allowedStatuses = opts.mode === "inspect"
    ? new Set<CadStatus>([CadStatus.UPLOADED, CadStatus.FAILED, CadStatus.ANALYZING])
    : new Set<CadStatus>([CadStatus.UPLOADED, CadStatus.FAILED, CadStatus.EXTRACTING, CadStatus.SETUP_REQUIRED]);
  if (!allowedStatuses.has(cadFile.status)) return;

  if (opts.mode === "extract" && !cadFile.analysis?.setupConfirmedAt) {
    await markFailed(opts.cadFileId, "Drawing setup must be confirmed before extraction.");
    return;
  }

  const status = opts.mode === "inspect" ? CadStatus.ANALYZING : CadStatus.EXTRACTING;
  await prisma.cadFile.update({
    where: { id: cadFile.id },
    data: {
      status,
      errorMessage: null,
      processingLog: {
        mode: opts.mode,
        stage: "loading_file",
        progressLabel: "Loading the stored drawing",
        startedAt: startedAt.toISOString(),
        heartbeatAt: startedAt.toISOString(),
        elapsedMs: 0,
        pipeline: "gemini-pdf",
      },
    },
  });

  try {
    const buffer = await getObjectResilient(cadFile.storageKey);
    await updateProgress(opts, startedAt, "processing", opts.mode === "inspect" ? "Analyzing with AI" : "Extracting map candidates");

    const { inspectPdf, extractPdf } = await import("./cad-pdf");
    if (opts.mode === "inspect") {
      const { result, previewBuffer } = await inspectPdf(buffer, cadFile.originalName);
      const { persistSyncInspect } = await import("./cad");
      await persistSyncInspect(opts.tenantId, cadFile.id, result, previewBuffer);
      await prisma.cadFile.update({
        where: { id: cadFile.id },
        data: {
          processingLog: {
            mode: opts.mode,
            inspectedAt: new Date().toISOString(),
            sourceKind: stringValue(result.analysis?.sourceKind),
            discipline: stringValue(result.analysis?.discipline),
            pipeline: "gemini-pdf",
          },
        },
      });
      return;
    }

    const analysis = serializeAnalysis(cadFile.analysis);
    const result = await extractPdf(buffer, cadFile.originalName, analysis);
    const updatedAnalysis = await prisma.cadAnalysis.findUniqueOrThrow({ where: { cadFileId: cadFile.id } });
    const { persistCadExtractionResult } = await import("./cad");
    await persistCadExtractionResult(opts.tenantId, cadFile.id, result, updatedAnalysis, "gemini-pdf");
  } catch (error) {
    await markFailed(opts.cadFileId, error instanceof Error ? error.message : "Map processing failed.");
  }
}

async function updateProgress(
  opts: { tenantId: string; cadFileId: string; mode: CadPdfMode },
  startedAt: Date,
  stage: string,
  label: string,
) {
  const heartbeatAt = new Date();
  await prisma.cadFile.updateMany({
    where: { id: opts.cadFileId, tenantId: opts.tenantId },
    data: {
      processingLog: {
        mode: opts.mode,
        stage,
        progressLabel: label,
        startedAt: startedAt.toISOString(),
        heartbeatAt: heartbeatAt.toISOString(),
        elapsedMs: heartbeatAt.getTime() - startedAt.getTime(),
        pipeline: "gemini-pdf",
      },
    },
  });
}

async function markFailed(cadFileId: string, message: string) {
  await prisma.cadFile.update({
    where: { id: cadFileId },
    data: {
      status: CadStatus.FAILED,
      errorMessage: message.slice(0, 2_000),
      processingLog: {
        failedAt: new Date().toISOString(),
        pipeline: "gemini-pdf",
      },
    },
  });
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
  } as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
