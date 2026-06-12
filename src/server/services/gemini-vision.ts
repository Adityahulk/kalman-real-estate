import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY ?? "";

function getModel() {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured. Set it in the environment to enable PDF intelligence.");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

export type GeminiEntity = {
  label: string | null;
  type: "PLOT" | "ROAD" | "PARK" | "BOUNDARY" | "UTILITY" | "ELECTRICAL_POINT" | "GATE" | "CLUBHOUSE" | "DRAINAGE" | "UNKNOWN";
  confidence: number;
  polygon?: number[][];
  polyline?: number[][];
  point?: number[];
};

export type GeminiInspectResult = {
  discipline: "SITE_LAYOUT" | "ELECTRICAL" | "MIXED" | "ARCHITECTURAL" | "AUTO";
  sourceKind: string;
  proposedRegion: { x: number; y: number; width: number; height: number };
  excludedRegions: Array<{ label: string; x: number; y: number; width: number; height: number }>;
  expectedCounts: { total?: number; residential?: number; commercial?: number; ews?: number };
  pageDescription: string;
};

export type GeminiExtractResult = {
  entities: GeminiEntity[];
  layers: string[];
  metadata: { entityCount: number; plotCount: number; description: string };
};

const INSPECT_PROMPT = `You are analyzing an architectural/engineering site plan PDF page.

Return a JSON object with these fields:
- discipline: one of "SITE_LAYOUT", "ELECTRICAL", "MIXED", "ARCHITECTURAL", "AUTO"
- sourceKind: one of "VECTOR_PDF", "RASTER_PDF", "MIXED_RASTER_VECTOR"
- proposedRegion: {x, y, width, height} as fractions 0-1 of the page, identifying where the actual site drawing is (excluding title blocks, schedules, notes)
- excludedRegions: array of {label, x, y, width, height} for areas to exclude (title block, schedule tables, legend, general notes)
- expectedCounts: {total, residential, commercial, ews} - plot counts if visible in any schedule/table on the page. Use null for missing values.
- pageDescription: one sentence describing what the drawing shows

Look for:
- Schedule tables listing "Total No. of Plots", "Residential", "Commercial", "EWS" counts
- Title blocks (usually bottom-right or right side)
- Area schedules (usually left side or top-right)
- The actual site layout drawing area

Return ONLY valid JSON, no markdown fences.`;

const EXTRACT_PROMPT = `You are extracting entities from a site plan drawing image. The image shows a cropped region of a PDF page.

For each identifiable entity (plot, road, park, boundary, utility line, electrical point, gate, clubhouse, drainage), extract:

1. **Plots**: Look for numbered cells/parcels. Each plot should have:
   - label: the plot number (e.g. "1", "23", "C-5", "EWS-1")
   - type: "PLOT"
   - polygon: array of [x, y] points as pixel coordinates in the image, forming the closed boundary

2. **Roads**: Named or unnamed road shapes
   - label: road name if visible
   - type: "ROAD"
   - polygon: boundary points

3. **Parks/Open spaces**: Green areas or marked open spaces
   - type: "PARK"
   - polygon: boundary points

4. **Site boundary**: The outer boundary of the entire site
   - type: "BOUNDARY"
   - polygon: boundary points

5. **Electrical points**: Transformers, RMU, MPB symbols
   - type: "ELECTRICAL_POINT"
   - point: [x, y] center coordinate

6. **Utility lines**: Cable routes, water lines
   - type: "UTILITY"
   - polyline: array of [x, y] points along the line

Rules:
- Coordinates are in PIXEL space of this image (0,0 is top-left)
- For polygons, close the shape (last point = first point)
- confidence: 0.0-1.0 based on how certain you are
- Plot labels must be the actual plot number, not "Plot" or "Plot No."
- If you can't read a plot number clearly, set label to null
- Extract ALL visible plots, even if partially obscured

Return ONLY valid JSON with this structure:
{
  "entities": [...],
  "layers": ["Plots", "Roads", "Parks", ...],
  "metadata": { "entityCount": N, "plotCount": N, "description": "..." }
}`;

export async function inspectPdfWithGemini(imageBuffer: Buffer, mimeType: "image/png" | "image/jpeg" = "image/png"): Promise<GeminiInspectResult> {
  const model = getModel();
  const result = await model.generateContent([
    { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
    { text: INSPECT_PROMPT },
  ]);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    discipline: parsed.discipline ?? "AUTO",
    sourceKind: parsed.sourceKind ?? "VECTOR_PDF",
    proposedRegion: normalizeRegion(parsed.proposedRegion),
    excludedRegions: Array.isArray(parsed.excludedRegions)
      ? parsed.excludedRegions.map((r: Record<string, unknown>) => ({
          label: String(r.label ?? "Excluded"),
          ...normalizeRegion(r),
        }))
      : [],
    expectedCounts: {
      total: safeInt(parsed.expectedCounts?.total),
      residential: safeInt(parsed.expectedCounts?.residential),
      commercial: safeInt(parsed.expectedCounts?.commercial),
      ews: safeInt(parsed.expectedCounts?.ews),
    },
    pageDescription: String(parsed.pageDescription ?? ""),
  };
}

export async function extractPdfWithGemini(
  imageBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  mimeType: "image/png" | "image/jpeg" = "image/png",
): Promise<GeminiExtractResult> {
  const model = getModel();
  const result = await model.generateContent([
    { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
    { text: EXTRACT_PROMPT },
  ]);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const entities: GeminiEntity[] = [];
  for (const raw of parsed.entities ?? []) {
    const entity: GeminiEntity = {
      label: raw.label ?? null,
      type: validEntityType(raw.type),
      confidence: clamp(Number(raw.confidence) || 0.5),
    };
    if (Array.isArray(raw.polygon) && raw.polygon.length >= 3) {
      entity.polygon = raw.polygon
        .filter((p: unknown) => Array.isArray(p) && p.length >= 2)
        .map((p: number[]) => [clampCoord(p[0], imageWidth), clampCoord(p[1], imageHeight)]);
    }
    if (Array.isArray(raw.polyline) && raw.polyline.length >= 2) {
      entity.polyline = raw.polyline
        .filter((p: unknown) => Array.isArray(p) && p.length >= 2)
        .map((p: number[]) => [clampCoord(p[0], imageWidth), clampCoord(p[1], imageHeight)]);
    }
    if (Array.isArray(raw.point) && raw.point.length >= 2) {
      entity.point = [clampCoord(raw.point[0], imageWidth), clampCoord(raw.point[1], imageHeight)];
    }
    entities.push(entity);
  }
  return {
    entities,
    layers: Array.isArray(parsed.layers) ? parsed.layers.map(String) : [],
    metadata: {
      entityCount: entities.length,
      plotCount: entities.filter((e) => e.type === "PLOT").length,
      description: String(parsed.metadata?.description ?? ""),
    },
  };
}

export function geminiAvailable() {
  return Boolean(apiKey);
}

function normalizeRegion(r: Record<string, unknown> | undefined) {
  if (!r) return { x: 0, y: 0, width: 1, height: 1 };
  const x = clamp(Number(r.x) || 0);
  const y = clamp(Number(r.y) || 0);
  const width = Math.max(0.01, Math.min(1 - x, Number(r.width) || 1));
  const height = Math.max(0.01, Math.min(1 - y, Number(r.height) || 1));
  return { x, y, width, height };
}

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}

function clampCoord(v: number, max: number) {
  return Math.min(max, Math.max(0, Number(v) || 0));
}

function safeInt(v: unknown) {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

const VALID_TYPES = new Set(["PLOT", "ROAD", "PARK", "BOUNDARY", "UTILITY", "ELECTRICAL_POINT", "GATE", "CLUBHOUSE", "DRAINAGE", "UNKNOWN"]);
function validEntityType(t: unknown): GeminiEntity["type"] {
  const s = String(t ?? "UNKNOWN").toUpperCase();
  return VALID_TYPES.has(s) ? s as GeminiEntity["type"] : "UNKNOWN";
}
