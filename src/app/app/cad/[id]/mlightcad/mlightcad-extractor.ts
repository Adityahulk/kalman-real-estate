export type BrowserCadLayer = {
  name: string;
  color?: string;
  visible: boolean;
  purpose?: string;
};

export type BrowserCadEntity = {
  sourceHandle: string;
  nativeType: string;
  layer: string;
  blockPath: string[];
  label?: string | null;
  geometry: Record<string, unknown>;
  measurements?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  confidence?: number;
  validation?: Record<string, unknown>;
};

export type BrowserCadExtraction = {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  drawingUnits?: string;
  layers: BrowserCadLayer[];
  entities: BrowserCadEntity[];
  metadata: Record<string, unknown>;
};

type EntityLike = Record<string, unknown> & {
  objectId: string;
  dxfTypeName?: string;
  type?: string;
  layer?: string;
  geometricExtents?: unknown;
};
type DatabaseLike = {
  insunits: number;
  extmin: unknown;
  extmax: unknown;
  tables: {
    layerTable: { newIterator(): Iterable<Record<string, unknown> & { name: string; isOff: boolean; isFrozen: boolean; color: unknown }> };
    blockTable: { modelSpace: { newIterator(): Iterable<Record<string, unknown>> } };
  };
};
type Point = [number, number];

export function extractMlightCadDatabase(database: DatabaseLike): BrowserCadExtraction {
  const bounds = databaseBounds(database);
  const layers = Array.from(database.tables.layerTable.newIterator()).map((layer) => ({
    name: layer.name,
    color: colorString(layer.color),
    visible: !layer.isOff && !layer.isFrozen,
    purpose: inferLayerPurpose(layer.name),
  }));
  const rawEntities = Array.from(database.tables.blockTable.modelSpace.newIterator()) as EntityLike[];
  const textEntities = rawEntities.flatMap(textRecord);
  const entities: BrowserCadEntity[] = [];
  const lineSegments: Array<{ sourceHandle: string; layer: string; points: [Point, Point] }> = [];

  for (const entity of rawEntities) {
    const nativeType = String(entity.dxfTypeName || entity.type || entity.constructor.name).toUpperCase();
    if (nativeType === "TEXT" || nativeType === "MTEXT") continue;
    const sourceHandle = String(entity.objectId);
    const layer = String(entity.layer || "0");

    if (nativeType === "LWPOLYLINE" || nativeType === "POLYLINE") {
      const points = polylinePoints(entity);
      if (points.length < 2) continue;
      const closed = Boolean(entity.closed);
      if (closed && points.length >= 3) {
        entities.push(candidateFromPoints(entity, points, true, textEntities));
      } else if (isBusinessLayer(layer)) {
        entities.push(candidateFromPoints(entity, points, false, textEntities));
      }
      continue;
    }

    if (nativeType === "LINE") {
      const points = linePoints(entity);
      if (!points) continue;
      lineSegments.push({ sourceHandle, layer, points });
      if (isLinearAssetLayer(layer)) {
        entities.push(candidateFromPoints(entity, points, false, textEntities));
      }
      continue;
    }

    if (nativeType === "INSERT") {
      const point = readPoint(entity.position);
      if (!point) continue;
      const blockName = String(entity.blockName || "Block");
      const attributes = readBlockAttributes(entity);
      entities.push({
        sourceHandle,
        nativeType,
        layer,
        blockPath: [blockName],
        label: firstAttribute(attributes) || blockName,
        geometry: { type: "point", point },
        attributes,
        confidence: isBusinessLayer(`${layer} ${blockName}`) ? 0.88 : 0.58,
      });
      continue;
    }

    if (nativeType === "POINT") {
      const point = readPoint(entity.position);
      if (point && isBusinessLayer(layer)) {
        entities.push({
          sourceHandle,
          nativeType,
          layer,
          blockPath: [],
          label: nearestText(point, textEntities)?.text ?? null,
          geometry: { type: "point", point },
          confidence: 0.58,
        });
      }
      continue;
    }

    if (nativeType === "CIRCLE" || nativeType === "ARC" || nativeType === "ELLIPSE") {
      const extent = entityBounds(entity);
      if (!extent || !isBusinessLayer(layer)) continue;
      const center: Point = [(extent.minX + extent.maxX) / 2, (extent.minY + extent.maxY) / 2];
      entities.push({
        sourceHandle,
        nativeType,
        layer,
        blockPath: [],
        label: nearestText(center, textEntities)?.text ?? null,
        geometry: { type: nativeType.toLowerCase(), center, bounds: extent },
        confidence: 0.55,
      });
    }
  }

  entities.push(...stitchClosedLinework(lineSegments, textEntities, bounds));
  return {
    bounds,
    drawingUnits: unitName(database.insunits),
    layers,
    entities: deduplicateEntities(entities),
    metadata: {
      modelSpaceEntityCount: rawEntities.length,
      candidateCount: entities.length,
      textEntityCount: textEntities.length,
      parser: "MLightCAD",
    },
  };
}

function candidateFromPoints(
  entity: EntityLike,
  inputPoints: Point[],
  closed: boolean,
  texts: Array<{ text: string; point: Point }>,
): BrowserCadEntity {
  const points = closed ? closeRing(inputPoints) : inputPoints;
  const center = centroid(points);
  return {
    sourceHandle: String(entity.objectId),
    nativeType: String(entity.dxfTypeName || entity.type || "POLYLINE"),
    layer: String(entity.layer || "0"),
    blockPath: [],
    label: nearestTextInside(points, texts)?.text ?? nearestText(center, texts)?.text ?? null,
    geometry: { type: closed ? "polygon" : "polyline", points, closed },
    confidence: closed ? 0.78 : 0.55,
  };
}

function textRecord(entity: EntityLike) {
  const nativeType = String(entity.dxfTypeName || entity.type || "").toUpperCase();
  if (nativeType !== "TEXT" && nativeType !== "MTEXT") return [];
  const text = cleanCadText(String(entity.textString || entity.contents || ""));
  const point = readPoint(entity.position || entity.location);
  return text && point ? [{ text, point }] : [];
}

function polylinePoints(entity: EntityLike): Point[] {
  const count = Number(entity.numberOfVertices || 0);
  const getPoint = entity.getPoint2dAt;
  if (!Number.isInteger(count) || count <= 0 || typeof getPoint !== "function") return [];
  const points: Point[] = [];
  for (let index = 0; index < Math.min(count, 100_000); index += 1) {
    const point = readPoint((getPoint as (index: number) => unknown).call(entity, index));
    if (point) points.push(point);
  }
  return points;
}

function linePoints(entity: EntityLike): [Point, Point] | null {
  const start = readPoint(entity.startPoint);
  const end = readPoint(entity.endPoint);
  return start && end ? [start, end] : null;
}

function readPoint(value: unknown): Point | null {
  if (!value || typeof value !== "object") return null;
  const point = value as Record<string, unknown>;
  return typeof point.x === "number" && typeof point.y === "number"
    && Number.isFinite(point.x) && Number.isFinite(point.y)
    ? [point.x, point.y]
    : null;
}

function databaseBounds(database: DatabaseLike) {
  const min = readPoint(database.extmin);
  const max = readPoint(database.extmax);
  if (min && max && max[0] > min[0] && max[1] > min[1]) {
    return { minX: min[0], minY: min[1], maxX: max[0], maxY: max[1] };
  }
  const extents = Array.from(database.tables.blockTable.modelSpace.newIterator())
    .map((entity) => entityBounds(entity as EntityLike))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  if (!extents.length) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  return {
    minX: Math.min(...extents.map((value) => value.minX)),
    minY: Math.min(...extents.map((value) => value.minY)),
    maxX: Math.max(...extents.map((value) => value.maxX)),
    maxY: Math.max(...extents.map((value) => value.maxY)),
  };
}

function entityBounds(entity: EntityLike) {
  try {
    const box = entity.geometricExtents as unknown as Record<string, unknown> | undefined;
    const min = readPoint(box?.minPoint);
    const max = readPoint(box?.maxPoint);
    return min && max ? { minX: min[0], minY: min[1], maxX: max[0], maxY: max[1] } : null;
  } catch {
    return null;
  }
}

function stitchClosedLinework(
  segments: Array<{ sourceHandle: string; layer: string; points: [Point, Point] }>,
  texts: Array<{ text: string; point: Point }>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  if (segments.length > 25_000) return [];
  const tolerance = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.00001;
  const candidates: BrowserCadEntity[] = [];
  const byLayer = new Map<string, typeof segments>();
  for (const segment of segments) {
    byLayer.set(segment.layer, [...(byLayer.get(segment.layer) ?? []), segment]);
  }
  for (const [layer, layerSegments] of byLayer) {
    if (!isParcelLayer(layer) || layerSegments.length > 10_000) continue;
    const unused = new Set(layerSegments);
    for (const first of layerSegments) {
      if (!unused.delete(first)) continue;
      const points: Point[] = [first.points[0], first.points[1]];
      while (points.length < 500) {
        const end = points[points.length - 1];
        const next = [...unused].find((segment) => near(segment.points[0], end, tolerance) || near(segment.points[1], end, tolerance));
        if (!next) break;
        unused.delete(next);
        points.push(near(next.points[0], end, tolerance) ? next.points[1] : next.points[0]);
        if (near(points[points.length - 1], points[0], tolerance)) {
          const ring = closeRing(points);
          if (ring.length >= 4 && polygonArea(ring) > tolerance * tolerance) {
            candidates.push({
              sourceHandle: `joined:${first.sourceHandle}`,
              nativeType: "JOINED_LINEWORK",
              layer,
              blockPath: [],
              label: nearestTextInside(ring, texts)?.text ?? null,
              geometry: { type: "polygon", points: ring, closed: true },
              confidence: 0.68,
              validation: { reconstructedFromLinework: true },
            });
          }
          break;
        }
      }
    }
  }
  return candidates;
}

function readBlockAttributes(entity: EntityLike) {
  const attributes: Record<string, string> = {};
  const iterator = entity.attributeIterator;
  if (typeof iterator !== "function") return attributes;
  try {
    for (const attribute of (iterator as () => Iterable<Record<string, unknown>>).call(entity)) {
      const key = String(attribute.tag || attribute.tagString || "").trim();
      const value = String(attribute.textString || attribute.value || "").trim();
      if (key && value) attributes[key] = value;
    }
  } catch {
    return attributes;
  }
  return attributes;
}

function firstAttribute(attributes: Record<string, unknown>) {
  return Object.values(attributes).find((value): value is string => typeof value === "string");
}

function cleanCadText(value: string) {
  return value.replace(/\\[A-Za-z][^;]*;/g, "").replace(/[{}]/g, "").replace(/\\P/g, " ").trim().slice(0, 500);
}

function nearestTextInside(points: Point[], texts: Array<{ text: string; point: Point }>) {
  return texts.find((text) => pointInPolygon(text.point, points));
}

function nearestText(point: Point, texts: Array<{ text: string; point: Point }>) {
  let best: { text: string; point: Point } | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const text of texts) {
    const distance = Math.hypot(text.point[0] - point[0], text.point[1] - point[1]);
    if (distance < bestDistance) {
      best = text;
      bestDistance = distance;
    }
  }
  return best;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function centroid(points: Point[]): Point {
  const total = points.reduce((value, point) => [value[0] + point[0], value[1] + point[1]] as Point, [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
}

function closeRing(points: Point[]) {
  return near(points[0], points[points.length - 1], 1e-9) ? points : [...points, [...points[0]] as Point];
}

function near(first: Point, second: Point, tolerance: number) {
  return Math.abs(first[0] - second[0]) <= tolerance && Math.abs(first[1] - second[1]) <= tolerance;
}

function polygonArea(points: Point[]) {
  return Math.abs(points.slice(1).reduce(
    (sum, point, index) => sum + points[index][0] * point[1] - point[0] * points[index][1],
    0,
  )) / 2;
}

function isParcelLayer(value: string) {
  return /PLOT|PARCEL|LOT\b|SITE|BOUNDARY|PROPERTY/i.test(value);
}

function isLinearAssetLayer(value: string) {
  return /ROAD|STREET|DRAIN|SEWER|PIPE|CABLE|HT\b|LT\b|WATER|BOUNDARY/i.test(value);
}

function isBusinessLayer(value: string) {
  return /PLOT|PARCEL|LOT\b|SITE|ROAD|STREET|PARK|GREEN|BOUNDARY|GATE|CLUB|COMMUNITY|DRAIN|SEWER|PIPE|CABLE|ELECT|TRANSFORMER|RMU|MPB|POLE|ROOM|BATH|TOILET|KITCHEN|STAIR|GARDEN|DOOR|WINDOW|WALL|STRUCT/i.test(value);
}

function inferLayerPurpose(value: string) {
  if (isParcelLayer(value)) return "Plot boundaries";
  if (/ROAD|STREET/i.test(value)) return "Roads";
  if (/ELECT|TRANSFORMER|RMU|MPB|HT\b|LT\b|POLE|CABLE/i.test(value)) return "Electrical";
  if (/DRAIN|SEWER|WATER|PIPE/i.test(value)) return "Utilities";
  if (/PARK|GREEN|GARDEN/i.test(value)) return "Landscape";
  return undefined;
}

function unitName(value: number) {
  const units: Record<number, string> = {
    1: "inches",
    2: "feet",
    3: "miles",
    4: "millimeters",
    5: "centimeters",
    6: "meters",
    7: "kilometers",
    10: "yards",
  };
  return units[value];
}

function colorString(color: unknown) {
  if (!color || typeof color !== "object") return undefined;
  const value = color as { toCssColor?: () => string };
  try {
    return value.toCssColor?.();
  } catch {
    return undefined;
  }
}

function deduplicateEntities(entities: BrowserCadEntity[]) {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = `${entity.sourceHandle}:${JSON.stringify(entity.geometry)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
