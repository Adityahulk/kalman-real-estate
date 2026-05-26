export type CadFormat = "dwg" | "dxf" | "pdf";
export type CadStatus =
  | "uploaded"
  | "converting"
  | "parsing"
  | "extracting"
  | "review_required"
  | "published"
  | "failed";

export type CadScope = "project" | "plot" | "unit" | "room";

export type CadEntityType =
  | "plot"
  | "road"
  | "boundary"
  | "park"
  | "clubhouse"
  | "water"
  | "electrical"
  | "gate"
  | "drainage"
  | "room"
  | "bathroom"
  | "kitchen"
  | "garden"
  | "staircase"
  | "parking"
  | "wall"
  | "door"
  | "window"
  | "plumbing"
  | "electrical_point"
  | "dimension";

export type CadGeometry =
  | { kind: "polygon"; points: [number, number][] }
  | { kind: "line"; points: [number, number][]; thickness: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "dot"; x: number; y: number; r: number };

export interface CadLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  purpose: "plots" | "infrastructure" | "utilities" | "amenities" | "labels" | "dimensions" | "interiors";
}

export interface CadReviewIssue {
  id: string;
  severity: "info" | "warning" | "critical";
  entityId?: string;
  title: string;
  detail: string;
}

export interface CadEntity {
  id: string;
  type: CadEntityType;
  label: string;
  layerId: string;
  confidence: number;
  geometry: CadGeometry;
  measurements?: { areaSqft?: number; lengthFt?: number; widthFt?: number };
  sourceHandle: string;
  confirmed: boolean;
  published: boolean;
  warnings?: string[];
  childSceneId?: string;
}

export interface CadScene {
  id: string;
  tenantId: string;
  parentId?: string;
  parentEntityId?: string;
  scope: CadScope;
  title: string;
  version: number;
  status: CadStatus;
  format: CadFormat;
  originalFileName: string;
  storageKey: string;
  viewBox: { w: number; h: number };
  layers: CadLayer[];
  entities: CadEntity[];
  issues: CadReviewIssue[];
  auditTrail: { at: string; by: string; text: string }[];
}

export interface CadFile {
  id: string;
  tenantId: string;
  sceneId: string;
  format: CadFormat;
  originalFileName: string;
  storageKey: string;
  uploadedBy: string;
  uploadedAt: string;
  byteSize: number;
  checksum: string;
}

export interface SpatialLink {
  id: string;
  cadSceneId: string;
  cadEntityId: string;
  targetType: "plot" | "site_asset" | "checklist_item" | "room" | "utility_point" | "boq_item";
  targetId: string;
  linkStatus: "suggested" | "confirmed" | "published";
}

export interface CadVersionComparison {
  sceneId: string;
  previousVersion?: number;
  currentVersion: number;
  added: number;
  removed: number;
  changed: number;
  warnings: string[];
}

export const CAD_PIPELINE: CadStatus[] = [
  "uploaded",
  "converting",
  "parsing",
  "extracting",
  "review_required",
  "published"
];

const SITE_LAYERS: CadLayer[] = [
  { id: "plots", name: "PLOT_BOUNDARIES", color: "#0ea5e9", visible: true, purpose: "plots" },
  { id: "infra", name: "ROADS_BOUNDARY", color: "#475569", visible: true, purpose: "infrastructure" },
  { id: "utilities", name: "WATER_ELECTRICAL_DRAINAGE", color: "#16a34a", visible: true, purpose: "utilities" },
  { id: "amenities", name: "PARK_CLUB_GATE", color: "#8b5cf6", visible: true, purpose: "amenities" },
  { id: "labels", name: "TEXT_LABELS_DIMENSIONS", color: "#0f172a", visible: true, purpose: "labels" }
];

const PLOT_LAYERS: CadLayer[] = [
  { id: "walls", name: "WALLS_OPENINGS", color: "#334155", visible: true, purpose: "interiors" },
  { id: "rooms", name: "ROOM_ZONES", color: "#0ea5e9", visible: true, purpose: "interiors" },
  { id: "services", name: "PLUMBING_ELECTRICAL", color: "#f59e0b", visible: true, purpose: "utilities" },
  { id: "labels", name: "TEXT_DIMENSIONS", color: "#0f172a", visible: true, purpose: "labels" }
];

export const SAMPLE_CAD_SCENES: CadScene[] = [
  {
    id: "cad-site-saldha-v1",
    tenantId: "tenant-demo",
    scope: "project",
    title: "Saldha Land Developers - Site CAD",
    version: 1,
    status: "review_required",
    format: "dwg",
    originalFileName: "saldha-master-layout-v1.dwg",
    storageKey: "cad/tenant-demo/saldha-master-layout-v1.dwg",
    viewBox: { w: 1200, h: 820 },
    layers: SITE_LAYERS,
    entities: [
      {
        id: "cad-ent-road-1",
        type: "road",
        label: "30 ft Main Avenue",
        layerId: "infra",
        confidence: 96,
        geometry: { kind: "line", points: [[60, 105], [1140, 105]], thickness: 34 },
        measurements: { lengthFt: 940, widthFt: 30 },
        sourceHandle: "LWPOLYLINE-A103",
        confirmed: true,
        published: false
      },
      {
        id: "cad-ent-boundary-1",
        type: "boundary",
        label: "Perimeter Boundary",
        layerId: "infra",
        confidence: 93,
        geometry: { kind: "polygon", points: [[30, 40], [1170, 40], [1170, 790], [30, 790]] },
        measurements: { lengthFt: 3380 },
        sourceHandle: "POLYLINE-B001",
        confirmed: true,
        published: false
      },
      ...Array.from({ length: 12 }).map((_, index) => {
        const col = index % 6;
        const row = Math.floor(index / 6);
        return {
          id: `cad-ent-plot-${index + 1}`,
          type: "plot" as const,
          label: `A-${String(index + 1).padStart(2, "0")}`,
          layerId: "plots",
          confidence: index === 7 ? 71 : 92 - (index % 3) * 4,
          geometry: { kind: "rect" as const, x: 90 + col * 165, y: 190 + row * 150, w: 135, h: 105 },
          measurements: { areaSqft: 1800 + index * 35 },
          sourceHandle: `LWPOLYLINE-P${index + 1}`,
          confirmed: index !== 7,
          published: false,
          warnings: index === 7 ? ["Area text says 1,950 sqft but measured geometry is 2,045 sqft"] : undefined,
          childSceneId: index === 3 ? "cad-plot-a04-v1" : undefined
        };
      }),
      {
        id: "cad-ent-park-1",
        type: "park",
        label: "Central Park",
        layerId: "amenities",
        confidence: 88,
        geometry: { kind: "rect", x: 92, y: 520, w: 360, h: 145 },
        measurements: { areaSqft: 18000 },
        sourceHandle: "HATCH-PARK-04",
        confirmed: true,
        published: false
      },
      {
        id: "cad-ent-club-1",
        type: "clubhouse",
        label: "Community Centre",
        layerId: "amenities",
        confidence: 84,
        geometry: { kind: "rect", x: 760, y: 515, w: 230, h: 150 },
        measurements: { areaSqft: 6100 },
        sourceHandle: "BLOCK-CLUB-01",
        confirmed: true,
        published: false
      },
      {
        id: "cad-ent-water-1",
        type: "water",
        label: "Water Line W-01",
        layerId: "utilities",
        confidence: 86,
        geometry: { kind: "line", points: [[70, 720], [1090, 720]], thickness: 8 },
        measurements: { lengthFt: 1010 },
        sourceHandle: "POLYLINE-WATER-1",
        confirmed: true,
        published: false
      },
      {
        id: "cad-ent-elec-1",
        type: "electrical",
        label: "Electrical Feeder E-01",
        layerId: "utilities",
        confidence: 82,
        geometry: { kind: "line", points: [[85, 740], [1080, 740]], thickness: 6 },
        measurements: { lengthFt: 980 },
        sourceHandle: "POLYLINE-ELEC-1",
        confirmed: true,
        published: false
      }
    ],
    issues: [
      {
        id: "cad-issue-1",
        severity: "warning",
        entityId: "cad-ent-plot-8",
        title: "Area mismatch",
        detail: "Detected area differs from nearby CAD text by 95 sqft. Admin confirmation required before publish."
      },
      {
        id: "cad-issue-2",
        severity: "info",
        title: "Layer classified",
        detail: "Layer WATER_ELECTRICAL_DRAINAGE was classified using layer name and line color."
      }
    ],
    auditTrail: [
      { at: "2026-05-26T09:02:00.000Z", by: "Amit Kalra", text: "CAD uploaded and queued for automatic extraction." },
      { at: "2026-05-26T09:04:00.000Z", by: "CAD Engine", text: "Extracted 18 entities across 5 CAD layers." }
    ]
  },
  {
    id: "cad-plot-a04-v1",
    tenantId: "tenant-demo",
    parentId: "cad-site-saldha-v1",
    parentEntityId: "cad-ent-plot-4",
    scope: "plot",
    title: "Plot A-04 - Villa CAD",
    version: 1,
    status: "review_required",
    format: "dxf",
    originalFileName: "plot-a04-ground-floor.dxf",
    storageKey: "cad/tenant-demo/plot-a04-ground-floor.dxf",
    viewBox: { w: 900, h: 620 },
    layers: PLOT_LAYERS,
    entities: [
      {
        id: "plot-a04-living",
        type: "room",
        label: "Living Room",
        layerId: "rooms",
        confidence: 94,
        geometry: { kind: "rect", x: 70, y: 80, w: 280, h: 190 },
        measurements: { areaSqft: 365 },
        sourceHandle: "ROOM-101",
        confirmed: true,
        published: false,
        childSceneId: "cad-room-living-v1"
      },
      {
        id: "plot-a04-kitchen",
        type: "kitchen",
        label: "Kitchen",
        layerId: "rooms",
        confidence: 91,
        geometry: { kind: "rect", x: 380, y: 80, w: 180, h: 140 },
        measurements: { areaSqft: 190 },
        sourceHandle: "ROOM-102",
        confirmed: true,
        published: false
      },
      {
        id: "plot-a04-bath-1",
        type: "bathroom",
        label: "Bathroom 1",
        layerId: "rooms",
        confidence: 89,
        geometry: { kind: "rect", x: 595, y: 80, w: 115, h: 115 },
        measurements: { areaSqft: 72 },
        sourceHandle: "ROOM-103",
        confirmed: true,
        published: false
      },
      {
        id: "plot-a04-bedroom",
        type: "room",
        label: "Bedroom",
        layerId: "rooms",
        confidence: 86,
        geometry: { kind: "rect", x: 70, y: 315, w: 245, h: 165 },
        measurements: { areaSqft: 285 },
        sourceHandle: "ROOM-104",
        confirmed: true,
        published: false
      },
      {
        id: "plot-a04-garden",
        type: "garden",
        label: "Front Garden",
        layerId: "rooms",
        confidence: 78,
        geometry: { kind: "rect", x: 380, y: 315, w: 330, h: 150 },
        measurements: { areaSqft: 515 },
        sourceHandle: "LANDSCAPE-01",
        confirmed: false,
        published: false,
        warnings: ["Garden boundary is open on north-east corner"]
      },
      {
        id: "plot-a04-plumbing",
        type: "plumbing",
        label: "Wet Line P-01",
        layerId: "services",
        confidence: 83,
        geometry: { kind: "line", points: [[610, 210], [610, 450], [420, 450]], thickness: 7 },
        measurements: { lengthFt: 48 },
        sourceHandle: "PLUMB-P01",
        confirmed: true,
        published: false
      },
      {
        id: "plot-a04-elec-1",
        type: "electrical_point",
        label: "DB Point",
        layerId: "services",
        confidence: 88,
        geometry: { kind: "dot", x: 350, y: 292, r: 11 },
        sourceHandle: "BLOCK-DB-01",
        confirmed: true,
        published: false
      }
    ],
    issues: [
      {
        id: "cad-plot-issue-1",
        severity: "warning",
        entityId: "plot-a04-garden",
        title: "Unclosed landscape polyline",
        detail: "The garden boundary is almost closed but one segment is missing. Confirm before publishing to owner view."
      }
    ],
    auditTrail: [
      { at: "2026-05-26T09:11:00.000Z", by: "Rajiv Bansal", text: "Plot-level CAD uploaded from owner portal." },
      { at: "2026-05-26T09:12:00.000Z", by: "CAD Engine", text: "Detected 7 plot development entities and 1 review issue." }
    ]
  },
  {
    id: "cad-room-living-v1",
    tenantId: "tenant-demo",
    parentId: "cad-plot-a04-v1",
    parentEntityId: "plot-a04-living",
    scope: "room",
    title: "Living Room - Electrical CAD",
    version: 1,
    status: "review_required",
    format: "pdf",
    originalFileName: "living-room-electrical-layout.pdf",
    storageKey: "cad/tenant-demo/living-room-electrical-layout.pdf",
    viewBox: { w: 700, h: 420 },
    layers: PLOT_LAYERS,
    entities: [
      {
        id: "living-light-1",
        type: "electrical_point",
        label: "Ceiling Light L1",
        layerId: "services",
        confidence: 87,
        geometry: { kind: "dot", x: 190, y: 135, r: 9 },
        sourceHandle: "PDF-CIRCLE-L1",
        confirmed: true,
        published: false
      },
      {
        id: "living-light-2",
        type: "electrical_point",
        label: "Ceiling Light L2",
        layerId: "services",
        confidence: 87,
        geometry: { kind: "dot", x: 500, y: 135, r: 9 },
        sourceHandle: "PDF-CIRCLE-L2",
        confirmed: true,
        published: false
      },
      {
        id: "living-wall",
        type: "wall",
        label: "Feature Wall",
        layerId: "walls",
        confidence: 80,
        geometry: { kind: "line", points: [[70, 330], [635, 330]], thickness: 10 },
        measurements: { lengthFt: 22 },
        sourceHandle: "PDF-LINE-WALL",
        confirmed: true,
        published: false
      }
    ],
    issues: [],
    auditTrail: [
      { at: "2026-05-26T09:16:00.000Z", by: "CAD Engine", text: "Vector PDF parsed into 3 electrical/interior entities." }
    ]
  }
];

export function cadSceneById(id: string) {
  return SAMPLE_CAD_SCENES.find((scene) => scene.id === id);
}
