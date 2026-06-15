import GeoJSONReader from "jsts/org/locationtech/jts/io/GeoJSONReader.js";
import GeoJSONWriter from "jsts/org/locationtech/jts/io/GeoJSONWriter.js";
import GeometryFactory from "jsts/org/locationtech/jts/geom/GeometryFactory.js";
import Polygonizer from "jsts/org/locationtech/jts/operation/polygonize/Polygonizer.js";
import UnaryUnionOp from "jsts/org/locationtech/jts/operation/union/UnaryUnionOp.js";
import RBush from "rbush";

export type BrowserCadLayer = {
  name: string;
  color?: string;
  visible: boolean;
  purpose?: string;
  metadata?: Record<string, unknown>;
};

export type BrowserCadLayerRole =
  | "PLOT"
  | "PLOT_LABEL"
  | "ROAD"
  | "PARK"
  | "BOUNDARY"
  | "UTILITY"
  | "DRAINAGE"
  | "ELECTRICAL_POINT"
  | "GATE"
  | "CLUBHOUSE"
  | "IGNORE"
  | "UNKNOWN";

export type BrowserCadExtractionOptions = {
  layerRoles?: Record<string, BrowserCadLayerRole>;
};

export type BrowserCadEntity = {
  sourceHandle: string;
  sourceHandles?: string[];
  nativeType: string;
  layer: string;
  blockPath: string[];
  label?: string | null;
  geometry: Record<string, unknown>;
  measurements?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  suggestedType?: string;
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
  blockTableRecord?: { name?: string; newIterator(): Iterable<Record<string, unknown>> };
  blockTransform?: { elements?: number[] };
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
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type Matrix = [number, number, number, number, number, number];
type Segment = { sourceHandle: string; layer: string; blockPath: string[]; points: [Point, Point] };
type TextRecord = { sourceHandle: string; layer: string; blockPath: string[]; text: string; point: Point };
type RingRecord = { sourceHandle: string; sourceHandles: string[]; layer: string; blockPath: string[]; points: Point[] };
type IndexedSegment = Segment & { minX: number; minY: number; maxX: number; maxY: number };
type LabelAssignment = {
  text: TextRecord;
  ring: Point[];
  distance: number;
  match: "inside" | "nearest";
  confidence: number;
};

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const MAX_FLATTENED_ENTITIES = 250_000;
const MAX_TOPOLOGY_SEGMENTS = 120_000;

export function extractMlightCadDatabase(
  database: DatabaseLike,
  options: BrowserCadExtractionOptions = {},
): BrowserCadExtraction {
  const bounds = databaseBounds(database);
  const layerRoles = normalizeLayerRoles(options.layerRoles);
  const layers = Array.from(database.tables.layerTable.newIterator()).map((layer) => ({
    name: layer.name,
    color: colorString(layer.color),
    visible: !layer.isOff && !layer.isFrozen,
    purpose: layerPurpose(layer.name, layerRoles),
    metadata: { role: roleForLayer(layer.name, layerRoles) },
  }));
  const segments: Segment[] = [];
  const texts: TextRecord[] = [];
  const closedRings: RingRecord[] = [];
  const assets: BrowserCadEntity[] = [];
  const stats = { visited: 0, expandedBlocks: 0 };

  for (const entity of database.tables.blockTable.modelSpace.newIterator()) {
    flattenEntity(entity as EntityLike, IDENTITY, [], segments, texts, closedRings, assets, stats, new Set());
    if (stats.visited >= MAX_FLATTENED_ENTITIES) break;
  }

  const topology = extractTopologyCandidates(segments, closedRings, texts, bounds, layerRoles);
  const entities = deduplicateEntities([...topology.entities, ...assets]);
  return {
    bounds,
    drawingUnits: unitName(database.insunits),
    layers,
    entities,
    metadata: {
      modelSpaceEntityCount: stats.visited,
      expandedBlockCount: stats.expandedBlocks,
      segmentCount: segments.length,
      polygonizedCellCount: topology.polygonCount,
      validPlotLabelCount: texts.filter((text) => isValidPlotLabel(text.text)).length,
      plotCandidateCount: entities.filter((entity) => entity.suggestedType === "PLOT").length,
      candidateCount: entities.length,
      textEntityCount: texts.length,
      layerRoleCount: Object.keys(layerRoles).length,
      parser: "MLightCAD",
      extractionMethod: "topology-v2",
    },
  };
}

function flattenEntity(
  entity: EntityLike,
  transform: Matrix,
  blockPath: string[],
  segments: Segment[],
  texts: TextRecord[],
  closedRings: RingRecord[],
  assets: BrowserCadEntity[],
  stats: { visited: number; expandedBlocks: number },
  blockStack: Set<string>,
) {
  if (stats.visited >= MAX_FLATTENED_ENTITIES) return;
  stats.visited += 1;
  const nativeType = entityType(entity);
  const sourceHandle = String(entity.objectId);
  const layer = String(entity.layer || "0");

  if (nativeType === "INSERT") {
    const blockName = String(entity.blockName || entity.blockTableRecord?.name || "Block");
    const attributes = readBlockAttributes(entity);
    const point = transformPoint(readPoint(entity.position) ?? [0, 0], transform);
    const assetType = explicitPointAssetType(`${layer} ${blockName} ${Object.values(attributes).join(" ")}`);
    if (assetType) {
      assets.push({
        sourceHandle,
        sourceHandles: [sourceHandle],
        nativeType,
        layer,
        blockPath: [...blockPath, blockName],
        label: firstAttribute(attributes) || blockName,
        geometry: { type: "point", point },
        attributes,
        suggestedType: assetType,
        confidence: 0.9,
        validation: { extractionMethod: "block-symbol" },
      });
    }
    const record = entity.blockTableRecord;
    if (!record?.newIterator || blockPath.length >= 12 || blockStack.has(blockName)) return;
    const nextTransform = multiplyMatrix(transform, matrixFromBlock(entity.blockTransform));
    const nextStack = new Set(blockStack).add(blockName);
    stats.expandedBlocks += 1;
    for (const child of record.newIterator()) {
      flattenEntity(
        child as EntityLike,
        nextTransform,
        [...blockPath, blockName],
        segments,
        texts,
        closedRings,
        assets,
        stats,
        nextStack,
      );
      if (stats.visited >= MAX_FLATTENED_ENTITIES) break;
    }
    return;
  }

  if (nativeType === "TEXT" || nativeType === "MTEXT" || nativeType === "ATTRIB" || nativeType === "ATTDEF") {
    const text = cleanCadText(String(entity.textString || entity.contents || entity.value || ""));
    const rawPoint = readPoint(entity.position || entity.location || entity.alignmentPoint);
    if (text && rawPoint) {
      texts.push({ sourceHandle, layer, blockPath, text, point: transformPoint(rawPoint, transform) });
    }
    return;
  }

  if (nativeType === "LWPOLYLINE" || nativeType === "POLYLINE" || nativeType === "2DPOLYLINE" || nativeType === "3DPOLYLINE") {
    const points = polylinePoints(entity).map((point) => transformPoint(point, transform));
    if (points.length < 2) return;
    const closed = Boolean(entity.closed) || near(points[0], points[points.length - 1], drawingTolerance(points));
    addPathSegments(points, closed, sourceHandle, layer, blockPath, segments);
    if (closed && points.length >= 3) {
      closedRings.push({
        sourceHandle,
        sourceHandles: [sourceHandle],
        layer,
        blockPath,
        points: closeRing(points),
      });
    } else if (isLinearAssetLayer(layer)) {
      assets.push({
        sourceHandle,
        sourceHandles: [sourceHandle],
        nativeType,
        layer,
        blockPath,
        label: null,
        geometry: { type: "polyline", points, closed: false },
        suggestedType: linearAssetType(layer),
        confidence: 0.72,
        validation: { extractionMethod: "native-linear-asset" },
      });
    }
    return;
  }

  if (nativeType === "LINE") {
    const points = linePoints(entity);
    if (!points) return;
    const transformed: [Point, Point] = [
      transformPoint(points[0], transform),
      transformPoint(points[1], transform),
    ];
    segments.push({ sourceHandle, layer, blockPath, points: transformed });
    return;
  }

  if (nativeType === "POINT") {
    const rawPoint = readPoint(entity.position);
    const assetType = explicitPointAssetType(layer);
    if (rawPoint && assetType) {
      assets.push({
        sourceHandle,
        sourceHandles: [sourceHandle],
        nativeType,
        layer,
        blockPath,
        label: null,
        geometry: { type: "point", point: transformPoint(rawPoint, transform) },
        suggestedType: assetType,
        confidence: 0.68,
      });
    }
  }
}

function extractTopologyCandidates(
  segments: Segment[],
  closedRings: RingRecord[],
  texts: TextRecord[],
  bounds: Bounds,
  layerRoles: Record<string, BrowserCadLayerRole>,
) {
  const tolerance = topologyTolerance(bounds, segments);
  const topologySegments = segments
    .filter((segment) => roleForLayer(segment.layer, layerRoles) !== "IGNORE")
    .slice(0, MAX_TOPOLOGY_SEGMENTS)
    .map((segment) => ({
      ...segment,
      points: [
        snapPoint(segment.points[0], tolerance),
        snapPoint(segment.points[1], tolerance),
      ] as [Point, Point],
    }))
    .filter((segment) => distance(segment.points[0], segment.points[1]) > tolerance * 0.25);
  const polygonized = polygonize(topologySegments);
  const segmentIndex = new RBush<IndexedSegment>();
  segmentIndex.load(topologySegments.map(indexedSegment));
  const layerByHandle = new Map(topologySegments.map((segment) => [segment.sourceHandle, segment.layer]));
  const rings = deduplicateRings([
    ...polygonized,
    ...closedRings
      .filter((ring) => roleForLayer(ring.layer, layerRoles) !== "IGNORE")
      .map((ring) => ring.points),
  ], tolerance);
  const validTexts = texts.filter((text) => isValidPlotLabel(text.text) && isUsablePlotLabelLayer(text.layer, layerRoles));
  const assignments = assignLabelsToRings(validTexts, rings, topologySegments, bounds, segmentIndex, layerByHandle, layerRoles);
  const assignedRingKeys = new Set(assignments.map((assignment) => ringKey(assignment.ring, tolerance)));
  const emittedRingKeys = new Set(assignedRingKeys);
  const labelledAreas = assignments.map((assignment) => polygonArea(assignment.ring)).filter((area) => area > 0);
  const medianArea = median(labelledAreas);

  const entities: BrowserCadEntity[] = assignments.map((assignment, index) => {
    const provenance = sourceHandlesForRing(assignment.ring, segmentIndex, tolerance);
    const area = polygonArea(assignment.ring);
    const perimeter = polygonPerimeter(assignment.ring);
    const sourceHandle = topologyHandle(assignment.text.text, assignment.ring, index, tolerance);
    const dominant = dominantLayer(provenance, layerByHandle) || assignment.text.layer || "0";
    const role = roleForLayer(dominant, layerRoles);
    const suggestedType = polygonTypeForRole(role) ?? "PLOT";
    return {
      sourceHandle,
      sourceHandles: provenance,
      nativeType: "TOPOLOGY_POLYGON",
      layer: dominant,
      blockPath: assignment.text.blockPath,
      label: normalizePlotLabel(assignment.text.text),
      geometry: { type: "polygon", points: assignment.ring, closed: true },
      measurements: { areaCadUnits: area, perimeterCadUnits: perimeter },
      suggestedType,
      confidence: suggestedType === "PLOT" ? assignment.confidence : Math.min(assignment.confidence, 0.78),
      validation: {
        extractionMethod: "topology-polygonization",
        sourceHandles: provenance,
        labelSourceHandle: assignment.text.sourceHandle,
        labelMatch: assignment.match,
        mappedLayerRole: role,
        topologyConfidence: assignment.confidence,
      },
    };
  });

  if (medianArea > 0) {
    const unlabelled = rings
      .filter((ring) => !assignedRingKeys.has(ringKey(ring, tolerance)))
      .filter((ring) => {
        const area = polygonArea(ring);
        const ratio = area / medianArea;
        const provenance = sourceHandlesForRing(ring, segmentIndex, tolerance);
        const dominant = dominantLayer(provenance, layerByHandle) || "0";
        const role = roleForLayer(dominant, layerRoles);
        if (role === "IGNORE" || nonPlotPolygonTypeForRole(role)) return false;
        if (role === "PLOT") return ratio >= 0.25 && ratio <= 4.5;
        return ratio >= 0.45 && ratio <= 2.2 && nearbyAssignedCount(ring, assignments, medianArea) >= 2;
      })
      .slice(0, 2_000);
    for (const [index, ring] of unlabelled.entries()) {
      const provenance = sourceHandlesForRing(ring, segmentIndex, tolerance);
      const dominant = dominantLayer(provenance, layerByHandle) || "0";
      const role = roleForLayer(dominant, layerRoles);
      emittedRingKeys.add(ringKey(ring, tolerance));
      entities.push({
        sourceHandle: topologyHandle("unlabelled", ring, index, tolerance),
        sourceHandles: provenance,
        nativeType: "TOPOLOGY_POLYGON",
        layer: dominant,
        blockPath: [],
        label: null,
        geometry: { type: "polygon", points: ring, closed: true },
        measurements: {
          areaCadUnits: polygonArea(ring),
          perimeterCadUnits: polygonPerimeter(ring),
        },
        suggestedType: "PLOT",
        confidence: role === "PLOT" ? 0.72 : 0.58,
        validation: {
          extractionMethod: "topology-polygonization",
          sourceHandles: provenance,
          mappedLayerRole: role,
          blockingCodes: ["MISSING_PLOT_LABEL"],
        },
      });
    }
  }

  const mappedPlotPolygons = rings
    .filter((ring) => !emittedRingKeys.has(ringKey(ring, tolerance)))
    .map((ring) => {
      const provenance = sourceHandlesForRing(ring, segmentIndex, tolerance);
      const dominant = dominantLayer(provenance, layerByHandle) || "0";
      const role = roleForLayer(dominant, layerRoles);
      return role === "PLOT" ? { ring, provenance, dominant, role } : null;
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .slice(0, 2_000);

  for (const [index, candidate] of mappedPlotPolygons.entries()) {
    emittedRingKeys.add(ringKey(candidate.ring, tolerance));
    entities.push({
      sourceHandle: topologyHandle("mapped-unlabelled", candidate.ring, index, tolerance),
      sourceHandles: candidate.provenance,
      nativeType: "TOPOLOGY_POLYGON",
      layer: candidate.dominant,
      blockPath: [],
      label: null,
      geometry: { type: "polygon", points: candidate.ring, closed: true },
      measurements: {
        areaCadUnits: polygonArea(candidate.ring),
        perimeterCadUnits: polygonPerimeter(candidate.ring),
      },
      suggestedType: "PLOT",
      confidence: 0.72,
      validation: {
        extractionMethod: "mapped-layer-polygonization",
        sourceHandles: candidate.provenance,
        mappedLayerRole: candidate.role,
        blockingCodes: ["MISSING_PLOT_LABEL"],
      },
    });
  }

  const mappedSitePolygons = rings
    .filter((ring) => !emittedRingKeys.has(ringKey(ring, tolerance)))
    .map((ring) => {
      const provenance = sourceHandlesForRing(ring, segmentIndex, tolerance);
      const dominant = dominantLayer(provenance, layerByHandle) || "0";
      const role = roleForLayer(dominant, layerRoles);
      const suggestedType = nonPlotPolygonTypeForRole(role);
      return suggestedType ? { ring, provenance, dominant, role, suggestedType } : null;
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .slice(0, 1_000);

  for (const [index, candidate] of mappedSitePolygons.entries()) {
    entities.push({
      sourceHandle: topologyHandle(candidate.suggestedType.toLowerCase(), candidate.ring, index, tolerance),
      sourceHandles: candidate.provenance,
      nativeType: "TOPOLOGY_POLYGON",
      layer: candidate.dominant,
      blockPath: [],
      label: null,
      geometry: { type: "polygon", points: candidate.ring, closed: true },
      measurements: {
        areaCadUnits: polygonArea(candidate.ring),
        perimeterCadUnits: polygonPerimeter(candidate.ring),
      },
      suggestedType: candidate.suggestedType,
      confidence: 0.74,
      validation: {
        extractionMethod: "mapped-layer-polygonization",
        sourceHandles: candidate.provenance,
        mappedLayerRole: candidate.role,
      },
    });
  }

  return { entities, polygonCount: rings.length };
}

function polygonize(segments: Segment[]): Point[][] {
  if (!segments.length) return [];
  try {
    const reader = new GeoJSONReader(new GeometryFactory());
    const writer = new GeoJSONWriter();
    const geometry = reader.read({
      type: "MultiLineString",
      coordinates: segments.map((segment) => segment.points),
    });
    const noded = UnaryUnionOp.union(geometry);
    const polygonizer = new Polygonizer();
    polygonizer.add(noded);
    const polygons = polygonizer.getPolygons();
    const output: Point[][] = [];
    for (let iterator = polygons.iterator(); iterator.hasNext();) {
      const geojson = writer.write(iterator.next()) as { type?: string; coordinates?: unknown };
      if (geojson.type !== "Polygon" || !Array.isArray(geojson.coordinates)) continue;
      const shell = geojson.coordinates[0];
      if (!Array.isArray(shell)) continue;
      const points = shell.map(readCoordinate).filter((point): point is Point => Boolean(point));
      if (points.length >= 4) output.push(closeRing(points));
    }
    return output;
  } catch {
    return [];
  }
}

function assignLabelsToRings(
  texts: TextRecord[],
  rings: Point[][],
  segments: Segment[],
  bounds: Bounds,
  segmentIndex: RBush<IndexedSegment>,
  layerByHandle: Map<string, string>,
  layerRoles: Record<string, BrowserCadLayerRole>,
): LabelAssignment[] {
  const diagonal = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const labelTolerance = topologyTolerance(bounds, segments);
  const maxNearestDistance = Math.max(diagonal * 0.0025, labelTolerance * 8);
  const proposals: LabelAssignment[] = texts.flatMap((text): LabelAssignment[] => {
    const containing = rings
      .filter((ring) => canAssignPlotLabel(ring, segmentIndex, layerByHandle, layerRoles, labelTolerance))
      .filter((ring) => pointInPolygon(text.point, ring))
      .sort((first, second) => polygonArea(first) - polygonArea(second));
    if (containing[0]) {
      return [{ text, ring: containing[0], distance: 0, match: "inside" as const, confidence: 0.96 }];
    }
    let best: Point[] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const ring of rings) {
      if (!canAssignPlotLabel(ring, segmentIndex, layerByHandle, layerRoles, labelTolerance)) continue;
      const candidateDistance = distance(text.point, polygonCentroid(ring));
      if (candidateDistance < bestDistance) {
        best = ring;
        bestDistance = candidateDistance;
      }
    }
    return best && bestDistance <= maxNearestDistance
      ? [{ text, ring: best, distance: bestDistance, match: "nearest" as const, confidence: 0.76 }]
      : [];
  }).sort((first, second) => {
    if (first.distance !== second.distance) return first.distance - second.distance;
    return polygonArea(first.ring) - polygonArea(second.ring);
  });

  const usedRings = new Set<string>();
  const usedTextHandles = new Set<string>();
  const assignments: LabelAssignment[] = [];
  const tolerance = topologyTolerance(bounds, segments);
  for (const proposal of proposals) {
    const key = ringKey(proposal.ring, tolerance);
    if (usedRings.has(key) || usedTextHandles.has(proposal.text.sourceHandle)) continue;
    usedRings.add(key);
    usedTextHandles.add(proposal.text.sourceHandle);
    assignments.push(proposal);
  }
  return assignments;
}

function addPathSegments(
  points: Point[],
  closed: boolean,
  sourceHandle: string,
  layer: string,
  blockPath: string[],
  segments: Segment[],
) {
  const path = closed ? closeRing(points) : points;
  for (let index = 1; index < path.length; index += 1) {
    if (samePoint(path[index - 1], path[index])) continue;
    segments.push({ sourceHandle, layer, blockPath, points: [path[index - 1], path[index]] });
  }
}

function sourceHandlesForRing(ring: Point[], index: RBush<IndexedSegment>, tolerance: number) {
  const handles = new Set<string>();
  for (let pointIndex = 1; pointIndex < ring.length; pointIndex += 1) {
    const midpoint: Point = [
      (ring[pointIndex - 1][0] + ring[pointIndex][0]) / 2,
      (ring[pointIndex - 1][1] + ring[pointIndex][1]) / 2,
    ];
    const candidates = index.search({
      minX: midpoint[0] - tolerance * 2,
      minY: midpoint[1] - tolerance * 2,
      maxX: midpoint[0] + tolerance * 2,
      maxY: midpoint[1] + tolerance * 2,
    });
    for (const segment of candidates) {
      if (pointToSegmentDistance(midpoint, segment.points[0], segment.points[1]) <= tolerance * 2) {
        handles.add(segment.sourceHandle);
        if (handles.size >= 64) return [...handles];
      }
    }
  }
  return [...handles];
}

function dominantLayer(handles: string[], layerByHandle: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const handle of handles) {
    const layer = layerByHandle.get(handle);
    if (!layer) continue;
    counts.set(layer, (counts.get(layer) ?? 0) + 1);
  }
  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0];
}

function indexedSegment(segment: Segment): IndexedSegment {
  return {
    ...segment,
    minX: Math.min(segment.points[0][0], segment.points[1][0]),
    minY: Math.min(segment.points[0][1], segment.points[1][1]),
    maxX: Math.max(segment.points[0][0], segment.points[1][0]),
    maxY: Math.max(segment.points[0][1], segment.points[1][1]),
  };
}

function nearbyAssignedCount(
  ring: Point[],
  assignments: Array<{ ring: Point[] }>,
  medianArea: number,
) {
  const center = polygonCentroid(ring);
  const radius = Math.sqrt(medianArea) * 3.5;
  return assignments.filter((assignment) => distance(center, polygonCentroid(assignment.ring)) <= radius).length;
}

function topologyTolerance(bounds: Bounds, segments: Segment[]) {
  const diagonal = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const lengths = segments.slice(0, 5_000)
    .map((segment) => distance(segment.points[0], segment.points[1]))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  const typical = lengths[Math.floor(lengths.length * 0.25)] ?? diagonal * 0.001;
  return Math.max(diagonal * 1e-7, typical * 0.001, 1e-8);
}

function topologyHandle(label: string, ring: Point[], index: number, tolerance: number) {
  const center = polygonCentroid(ring);
  const scale = Math.max(tolerance, 1e-8);
  return `topology:${normalizePlotLabel(label) || "cell"}:${Math.round(center[0] / scale)}:${Math.round(center[1] / scale)}:${index}`;
}

function ringKey(ring: Point[], tolerance: number) {
  const center = polygonCentroid(ring);
  const scale = Math.max(tolerance, 1e-8);
  return `${Math.round(center[0] / scale)}:${Math.round(center[1] / scale)}:${Math.round(polygonArea(ring) / (scale * scale))}`;
}

function deduplicateRings(rings: Point[][], tolerance: number) {
  const seen = new Set<string>();
  return rings.filter((ring) => {
    if (ring.length < 4 || polygonArea(ring) <= tolerance * tolerance) return false;
    const key = ringKey(ring, tolerance);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matrixFromBlock(value: unknown): Matrix {
  const elements = value && typeof value === "object" && Array.isArray((value as { elements?: unknown }).elements)
    ? (value as { elements: number[] }).elements
    : null;
  if (!elements || elements.length < 16) return IDENTITY;
  return [elements[0], elements[1], elements[4], elements[5], elements[12], elements[13]];
}

function multiplyMatrix(parent: Matrix, child: Matrix): Matrix {
  return [
    parent[0] * child[0] + parent[2] * child[1],
    parent[1] * child[0] + parent[3] * child[1],
    parent[0] * child[2] + parent[2] * child[3],
    parent[1] * child[2] + parent[3] * child[3],
    parent[0] * child[4] + parent[2] * child[5] + parent[4],
    parent[1] * child[4] + parent[3] * child[5] + parent[5],
  ];
}

function transformPoint(point: Point, matrix: Matrix): Point {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  ];
}

function entityType(entity: EntityLike) {
  return String(entity.dxfTypeName || entity.type || entity.constructor.name).toUpperCase();
}

function polylinePoints(entity: EntityLike): Point[] {
  const count = Number(entity.numberOfVertices || 0);
  const getPoint = entity.getPoint2dAt || entity.getPoint3dAt;
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

function readCoordinate(value: unknown): Point | null {
  return Array.isArray(value)
    && typeof value[0] === "number"
    && typeof value[1] === "number"
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
    ? [value[0], value[1]]
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
    const box = entity.geometricExtents as Record<string, unknown> | undefined;
    const min = readPoint(box?.minPoint);
    const max = readPoint(box?.maxPoint);
    return min && max ? { minX: min[0], minY: min[1], maxX: max[0], maxY: max[1] } : null;
  } catch {
    return null;
  }
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
  return value
    .replace(/\\[A-Za-z][^;]*;/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\P/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function normalizePlotLabel(value: string) {
  return cleanCadText(value).toUpperCase().replace(/\s+/g, "");
}

function isValidPlotLabel(value: string) {
  const label = normalizePlotLabel(value);
  if (!label || ["PLOT", "PLOTS", "PLOTTING", "PLOTNO.", "PLOTNO"].includes(label)) return false;
  return /^(?:EWS[-/]?\d+|COM[-/]?\d+|COMM[-/]?\d+|(?:[A-Z]{0,3}[-/]?)?\d{1,5}[A-Z]?)$/.test(label);
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const intersect = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonCentroid(points: Point[]): Point {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const cross = points[index][0] * points[index + 1][1] - points[index + 1][0] * points[index][1];
    twiceArea += cross;
    x += (points[index][0] + points[index + 1][0]) * cross;
    y += (points[index][1] + points[index + 1][1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    const total = points.reduce((value, point) => [value[0] + point[0], value[1] + point[1]] as Point, [0, 0]);
    return [total[0] / points.length, total[1] / points.length];
  }
  return [x / (3 * twiceArea), y / (3 * twiceArea)];
}

function closeRing(points: Point[]) {
  return samePoint(points[0], points[points.length - 1]) ? points : [...points, [...points[0]] as Point];
}

function samePoint(first: Point, second: Point) {
  return Math.abs(first[0] - second[0]) <= 1e-9 && Math.abs(first[1] - second[1]) <= 1e-9;
}

function near(first: Point, second: Point, tolerance: number) {
  return Math.abs(first[0] - second[0]) <= tolerance && Math.abs(first[1] - second[1]) <= tolerance;
}

function drawingTolerance(points: Point[]) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) * 1e-8;
}

function snapPoint(point: Point, tolerance: number): Point {
  return [
    Math.round(point[0] / tolerance) * tolerance,
    Math.round(point[1] / tolerance) * tolerance,
  ];
}

function polygonArea(points: Point[]) {
  return Math.abs(points.slice(1).reduce(
    (sum, point, index) => sum + points[index][0] * point[1] - point[0] * points[index][1],
    0,
  )) / 2;
}

function polygonPerimeter(points: Point[]) {
  return points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
}

function distance(first: Point, second: Point) {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

function pointToSegmentDistance(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return distance(point, [start[0] + t * dx, start[1] + t * dy]);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function explicitPointAssetType(value: string) {
  if (/ELECT|TRANSFORMER|RMU|MPB|POLE|LIGHT|PANEL|DB\b|POWER|HT\b|LT\b/i.test(value)) return "ELECTRICAL_POINT";
  if (/GATE|ENTRY|ENTRANCE|EXIT|ACCESS/i.test(value)) return "GATE";
  if (/UTILITY|WATER|VALVE|HYDRANT/i.test(value)) return "UTILITY";
  return null;
}

function linearAssetType(value: string) {
  if (/ROAD|STREET|R\.?O\.?W\.?|ROW\b|RD\b|LANE|DRIVEWAY|CARRIAGE|PATHWAY|RASTA/i.test(value)) return "ROAD";
  if (/DRAIN|SEWER|STORM|SWD\b|S\.?W\.?D\.?/i.test(value)) return "DRAINAGE";
  if (/BOUNDARY|PERIMETER|BDY\b|BND\b|SITE.?B|COMPOUND|FENCE|EXTENT|LIMIT/i.test(value)) return "BOUNDARY";
  return "UTILITY";
}

function isLinearAssetLayer(value: string) {
  return /ROAD|STREET|R\.?O\.?W\.?|ROW\b|RD\b|LANE|DRIVEWAY|DRAIN|SEWER|STORM|SWD\b|PIPE|CABLE|HT\b|LT\b|WATER|BOUNDARY|BDY\b|BND\b|PERIMETER/i.test(value);
}

function normalizeLayerRoles(input?: Record<string, BrowserCadLayerRole>) {
  const output: Record<string, BrowserCadLayerRole> = {};
  for (const [name, role] of Object.entries(input ?? {})) {
    const normalized = normalizeLayerRole(role);
    if (normalized && name.trim()) output[name.trim().toUpperCase()] = normalized;
  }
  return output;
}

function normalizeLayerRole(value: unknown): BrowserCadLayerRole | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  const allowed: BrowserCadLayerRole[] = [
    "PLOT",
    "PLOT_LABEL",
    "ROAD",
    "PARK",
    "BOUNDARY",
    "UTILITY",
    "DRAINAGE",
    "ELECTRICAL_POINT",
    "GATE",
    "CLUBHOUSE",
    "IGNORE",
    "UNKNOWN",
  ];
  return allowed.includes(normalized as BrowserCadLayerRole) ? normalized as BrowserCadLayerRole : null;
}

function roleForLayer(layer: string, roles: Record<string, BrowserCadLayerRole>) {
  return roles[layer.trim().toUpperCase()] ?? "UNKNOWN";
}

function layerPurpose(layer: string, roles: Record<string, BrowserCadLayerRole>) {
  const role = roleForLayer(layer, roles);
  if (role === "PLOT") return "Plot boundaries";
  if (role === "PLOT_LABEL") return "Plot labels";
  if (role === "ROAD") return "Roads";
  if (role === "PARK") return "Parks and open spaces";
  if (role === "BOUNDARY") return "Site boundary";
  if (role === "UTILITY") return "Utilities";
  if (role === "DRAINAGE") return "Drainage";
  if (role === "ELECTRICAL_POINT") return "Electrical";
  if (role === "GATE") return "Gates and entries";
  if (role === "CLUBHOUSE") return "Clubhouse";
  if (role === "IGNORE") return "Ignored by extraction";
  return inferLayerPurpose(layer);
}

function polygonTypeForRole(role: BrowserCadLayerRole) {
  if (role === "PLOT") return "PLOT";
  return nonPlotPolygonTypeForRole(role);
}

function nonPlotPolygonTypeForRole(role: BrowserCadLayerRole) {
  if (role === "ROAD") return "ROAD";
  if (role === "PARK") return "PARK";
  if (role === "BOUNDARY") return "BOUNDARY";
  if (role === "UTILITY") return "UTILITY";
  if (role === "DRAINAGE") return "DRAINAGE";
  if (role === "GATE") return "GATE";
  if (role === "CLUBHOUSE") return "CLUBHOUSE";
  return null;
}

function isUsablePlotLabelLayer(layer: string, roles: Record<string, BrowserCadLayerRole>) {
  const role = roleForLayer(layer, roles);
  return role !== "IGNORE" && role !== "ROAD" && role !== "PARK" && role !== "BOUNDARY"
    && role !== "UTILITY" && role !== "DRAINAGE" && role !== "ELECTRICAL_POINT"
    && role !== "GATE" && role !== "CLUBHOUSE";
}

function canAssignPlotLabel(
  ring: Point[],
  segmentIndex: RBush<IndexedSegment>,
  layerByHandle: Map<string, string>,
  layerRoles: Record<string, BrowserCadLayerRole>,
  tolerance: number,
) {
  const provenance = sourceHandlesForRing(ring, segmentIndex, tolerance);
  const dominant = dominantLayer(provenance, layerByHandle);
  const role = dominant ? roleForLayer(dominant, layerRoles) : "UNKNOWN";
  return role !== "IGNORE" && !nonPlotPolygonTypeForRole(role);
}

function inferLayerPurpose(value: string) {
  if (/PLOT|PARCEL|PCL\b|LOT\b|SITE|PROPERTY|SALE|UNIT.?BND|PL\b|PLT\b/i.test(value)) return "Plot boundaries";
  if (/ROAD|STREET|R\.?O\.?W\.?|ROW\b|RD\b|LANE|DRIVEWAY|CARRIAGE|PATHWAY|RASTA/i.test(value)) return "Roads";
  if (/ELECT|TRANSFORMER|RMU|MPB|HT\b|LT\b|POLE|CABLE|POWER|LIGHT|DB\b|PANEL/i.test(value)) return "Electrical";
  if (/DRAIN|SEWER|STORM|SWD\b|WATER|PIPE|UTILITY/i.test(value)) return "Utilities";
  if (/PARK|GREEN|GARDEN|LANDSCAPE|OPEN.?SPACE|OS\b|AMENITY/i.test(value)) return "Landscape";
  if (/BOUNDARY|PERIMETER|BDY\b|BND\b|COMPOUND|FENCE|EXTENT|LIMIT/i.test(value)) return "Site boundary";
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
