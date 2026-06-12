import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import {
  inspectPdfWithGemini,
  extractPdfWithGemini,
  type GeminiEntity,
} from "./gemini-vision";
import { cropPng, renderPdfPage, type PdfRenderMeta } from "./cad-pdf-render";

type Region = { x: number; y: number; width: number; height: number };

export type CadExtractionResult = {
  analysis?: Record<string, unknown>;
  layers: Array<string | { name: string; purpose?: string; color?: string; metadata?: Record<string, unknown> }>;
  entities: Array<{
    layer?: string;
    label?: string | null;
    type: string;
    confidence?: number;
    geometry: Record<string, unknown>;
    measurements?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    status?: string;
    sourceHandle?: string;
  }>;
};

export async function inspectPdf(pdfBuffer: Buffer, originalName: string): Promise<CadExtractionResult> {
  const dir = await mkWorkDir();
  try {
    const pdfPath = join(dir, safeName(originalName, ".pdf"));
    await writeFile(pdfPath, pdfBuffer);
    const previewPath = join(dir, "preview.png");
    const meta = await renderPdfPage(pdfPath, 1, 2.0, previewPath);
    const previewBuffer = await readFile(previewPath);
    const inspection = await inspectPdfWithGemini(previewBuffer);
    const expectedCounts = parseExpectedCounts(meta.pageText, inspection.expectedCounts);
    const sourceKind = meta.largestImage
      ? meta.vectorPathCount > 0 ? "MIXED_RASTER_VECTOR" : "RASTER_PDF"
      : "VECTOR_PDF";

    return {
      analysis: {
        discipline: inspection.discipline,
        sourceKind,
        pageNumber: 1,
        proposedRegion: inspection.proposedRegion,
        excludedRegions: inspection.excludedRegions,
        expectedCounts,
        inspection: {
          pageCount: meta.pageCount,
          pages: [{
            page: 1,
            width: meta.pageWidth,
            height: meta.pageHeight,
            vectorPathCount: meta.vectorPathCount,
            imageCount: meta.imageCount,
            textSpanCount: meta.textSpanCount,
          }],
          largestImage: meta.largestImage,
          recognitionImage: {
            source: meta.largestImage ? "embedded-image" : "rendered-page",
            page: 1,
            width: meta.width,
            height: meta.height,
            rect: meta.rect,
            renderScale: 2,
          },
          previewImage: {
            page: 1,
            width: meta.width,
            height: meta.height,
            rect: meta.rect,
            renderScale: 2,
          },
          pageBounds: [0, 0, meta.pageWidth, meta.pageHeight],
          requiresRasterRecognition: Boolean(meta.largestImage),
          requiresVectorExtraction: meta.vectorPathCount > 0,
          aiProvider: "gemini",
        },
        previewArtifact: "preview.png",
      },
      layers: [],
      entities: [],
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function extractPdf(
  pdfBuffer: Buffer,
  originalName: string,
  analysis: Record<string, unknown>,
): Promise<CadExtractionResult> {
  const dir = await mkWorkDir();
  try {
    const pdfPath = join(dir, safeName(originalName, ".pdf"));
    await writeFile(pdfPath, pdfBuffer);
    const pageNumber = Math.max(1, Number(analysis.pageNumber) || 1);
    const scale = 3.0;
    const fullPath = join(dir, "full-page.png");
    const meta = await renderPdfPage(pdfPath, pageNumber, scale, fullPath);
    const fullImage = await readFile(fullPath);

    const region = normalizedRegion(
      (analysis.confirmedRegion as Region) ?? (analysis.proposedRegion as Region),
    );

    const cropX = Math.round(region.x * meta.width);
    const cropY = Math.round(region.y * meta.height);
    const cropW = Math.round(region.width * meta.width);
    const cropH = Math.round(region.height * meta.height);

    let extractionImage: Buffer;
    if (region.x === 0 && region.y === 0 && region.width >= 0.99 && region.height >= 0.99) {
      extractionImage = fullImage;
    } else {
      const cropPath = join(dir, "region.png");
      await cropPng(fullPath, cropX, cropY, cropW, cropH, cropPath);
      extractionImage = await readFile(cropPath);
    }

    const geminiResult = await extractPdfWithGemini(extractionImage, cropW || meta.width, cropH || meta.height);

    const entities = geminiResult.entities.map((entity, index) =>
      geminiEntityToCandidate(entity, index, meta, region, scale),
    );

    const layers = geminiResult.layers.map((name) => ({
      name,
      purpose: name.toLowerCase().includes("plot") ? "PLOT" : "UNKNOWN",
      metadata: { source: "gemini-vision" },
    }));
    if (!layers.length) {
      layers.push({ name: "AI-detected entities", purpose: "PLOT", metadata: { source: "gemini-vision" } });
    }

    return {
      analysis: {
        ...analysis,
        inspection: {
          ...((analysis.inspection as Record<string, unknown>) ?? {}),
          recognition: {
            ocrEngine: "gemini-vision",
            entityCount: entities.length,
            candidateCount: entities.filter((e) => e.type === "PLOT").length,
            aiProvider: "gemini",
          },
          recognitionArtifact: "region.png",
        },
        recognitionArtifact: "region.png",
      },
      layers,
      entities,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function geminiEntityToCandidate(
  entity: GeminiEntity,
  index: number,
  meta: PdfRenderMeta,
  region: Region,
  renderScale: number,
) {
  const toPageCoord = (px: number, py: number): [number, number] => {
    const fullPx = region.x * meta.width + px;
    const fullPy = region.y * meta.height + py;
    return [fullPx / renderScale, fullPy / renderScale];
  };

  let geometry: Record<string, unknown>;
  let measurements: Record<string, unknown> = {};

  if (entity.polygon && entity.polygon.length >= 3) {
    const points = entity.polygon.map(([x, y]) => toPageCoord(x, y));
    if (points.length > 0 && (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1])) {
      points.push([...points[0]]);
    }
    geometry = { type: "polygon", points, closed: true };
    measurements = { areaPdfPoints: polygonArea(points) };
  } else if (entity.polyline && entity.polyline.length >= 2) {
    const points = entity.polyline.map(([x, y]) => toPageCoord(x, y));
    geometry = { type: "polyline", points, closed: false };
    measurements = { lengthPdfPoints: lineLength(points) };
  } else if (entity.point) {
    const [px, py] = toPageCoord(entity.point[0], entity.point[1]);
    geometry = { type: "point", point: [px, py] };
  } else {
    geometry = { type: "point", point: [0, 0] };
  }

  const blockingCodes: string[] = [];
  if (entity.type === "PLOT" && !entity.label) blockingCodes.push("MISSING_PLOT_LABEL");

  return {
    layer: entity.type === "PLOT" ? "AI plot candidates" : `AI ${entity.type.toLowerCase()} layer`,
    label: entity.label,
    type: entity.type,
    confidence: entity.confidence,
    geometry,
    measurements,
    validation: {
      source: "gemini-vision",
      closed: Boolean(entity.polygon),
      validPlotLabel: entity.type === "PLOT" && Boolean(entity.label),
      ocrConfidence: entity.confidence,
      blockingCodes,
    },
    status: "SUGGESTED",
    sourceHandle: `gemini:${entity.type.toLowerCase()}:${index}`,
  };
}

function polygonArea(points: number[][]) {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    total += x1 * y2 - x2 * y1;
  }
  return Math.abs(total / 2);
}

function lineLength(points: number[][]) {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  }
  return len;
}

function normalizedRegion(r: Region | null | undefined): Region {
  if (!r) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.max(0, Math.min(1, r.x));
  const y = Math.max(0, Math.min(1, r.y));
  return { x, y, width: Math.max(0.01, Math.min(1 - x, r.width)), height: Math.max(0.01, Math.min(1 - y, r.height)) };
}

function parseExpectedCounts(
  pageText: string,
  geminiCounts: { total?: number; residential?: number; commercial?: number; ews?: number },
) {
  const fromText = extractCountsFromText(pageText);
  return {
    total: fromText.total ?? geminiCounts.total,
    residential: fromText.residential ?? geminiCounts.residential,
    commercial: fromText.commercial ?? geminiCounts.commercial,
    ews: fromText.ews ?? geminiCounts.ews,
  };
}

function extractCountsFromText(text: string) {
  const normalized = text.replace(/\s+/g, " ").toUpperCase();
  const patterns: Record<string, RegExp> = {
    total: /TOTAL\s+NO\.?\s+OF\s+PLOTS\D{0,20}(\d{1,5})/,
    residential: /RESIDENTIAL\D{0,20}(\d{1,5})/,
    commercial: /COMMERCIAL\D{0,20}(\d{1,5})/,
    ews: /\bEWS\D{0,20}(\d{1,5})/,
  };
  const result: Record<string, number | undefined> = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = normalized.match(pattern);
    if (match) result[key] = parseInt(match[1], 10);
  }
  return result;
}

async function mkWorkDir() {
  const dir = join(tmpdir(), `kalman-cad-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

function safeName(name: string, ext: string) {
  const leaf = basename(name).replace(/[^a-zA-Z0-9._ -]/g, "-").trim() || `plan${ext}`;
  return leaf.toLowerCase().endsWith(ext) ? leaf : `${leaf}${ext}`;
}
