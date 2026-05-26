"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BoxSelect,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  Layers3,
  MousePointerClick,
  RotateCcw,
  Search,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  CAD_PIPELINE,
  SAMPLE_CAD_SCENES,
  type CadEntity,
  type CadEntityType,
  type CadGeometry,
  type CadLayer,
  type CadScene,
  type CadStatus
} from "@/data/cad";
import { cn } from "@/lib/cn";

const ENTITY_TONES: Record<CadEntityType, { fill: string; stroke: string; label: string }> = {
  plot: { fill: "#e0f2fe", stroke: "#0284c7", label: "Plot" },
  road: { fill: "#e2e8f0", stroke: "#475569", label: "Road" },
  boundary: { fill: "transparent", stroke: "#0f172a", label: "Boundary" },
  park: { fill: "#dcfce7", stroke: "#16a34a", label: "Park" },
  clubhouse: { fill: "#ede9fe", stroke: "#7c3aed", label: "Clubhouse" },
  water: { fill: "#cffafe", stroke: "#0891b2", label: "Water" },
  electrical: { fill: "#fef3c7", stroke: "#d97706", label: "Electrical" },
  gate: { fill: "#fef9c3", stroke: "#ca8a04", label: "Gate" },
  drainage: { fill: "#dbeafe", stroke: "#2563eb", label: "Drainage" },
  room: { fill: "#dbeafe", stroke: "#2563eb", label: "Room" },
  bathroom: { fill: "#cffafe", stroke: "#0891b2", label: "Bathroom" },
  kitchen: { fill: "#ffedd5", stroke: "#ea580c", label: "Kitchen" },
  garden: { fill: "#dcfce7", stroke: "#16a34a", label: "Garden" },
  staircase: { fill: "#f3e8ff", stroke: "#9333ea", label: "Staircase" },
  parking: { fill: "#f1f5f9", stroke: "#64748b", label: "Parking" },
  wall: { fill: "#e2e8f0", stroke: "#334155", label: "Wall" },
  door: { fill: "#fef3c7", stroke: "#d97706", label: "Door" },
  window: { fill: "#e0f2fe", stroke: "#0284c7", label: "Window" },
  plumbing: { fill: "#cffafe", stroke: "#0891b2", label: "Plumbing" },
  electrical_point: { fill: "#fef3c7", stroke: "#d97706", label: "Electrical point" },
  dimension: { fill: "#f8fafc", stroke: "#64748b", label: "Dimension" }
};

const STATUS_COPY: Record<CadStatus, string> = {
  uploaded: "Uploaded",
  converting: "Converting",
  parsing: "Parsing",
  extracting: "Extracting",
  review_required: "Review required",
  published: "Published",
  failed: "Failed"
};

function formatConfidence(confidence: number) {
  if (confidence >= 85) return "High";
  if (confidence >= 70) return "Medium";
  return "Low";
}

function confidenceTone(confidence: number) {
  if (confidence >= 85) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (confidence >= 70) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function geometryCenter(geometry: CadGeometry): [number, number] {
  if (geometry.kind === "rect") return [geometry.x + geometry.w / 2, geometry.y + geometry.h / 2];
  if (geometry.kind === "dot") return [geometry.x, geometry.y];
  const points = geometry.points;
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [x, y];
}

function entityMeasurement(entity: CadEntity) {
  if (entity.measurements?.areaSqft) return `${entity.measurements.areaSqft.toLocaleString("en-IN")} sqft`;
  if (entity.measurements?.lengthFt) return `${entity.measurements.lengthFt.toLocaleString("en-IN")} ft`;
  return "Measured from CAD";
}

function renderEntity(
  entity: CadEntity,
  selected: boolean,
  hiddenLayerIds: string[],
  onSelect: (entity: CadEntity) => void
) {
  if (hiddenLayerIds.includes(entity.layerId)) return null;
  const tone = ENTITY_TONES[entity.type];
  const common = {
    className: "cursor-pointer transition-all",
    onClick: () => onSelect(entity)
  };
  const strokeWidth = selected ? 7 : entity.type === "boundary" ? 4 : 3;
  const opacity = entity.published ? 0.95 : entity.confirmed ? 0.86 : 0.55;
  const [labelX, labelY] = geometryCenter(entity.geometry);

  let shape: React.ReactNode;
  if (entity.geometry.kind === "rect") {
    shape = (
      <rect
        {...common}
        x={entity.geometry.x}
        y={entity.geometry.y}
        width={entity.geometry.w}
        height={entity.geometry.h}
        rx={8}
        fill={tone.fill}
        stroke={selected ? "#0B1B3B" : tone.stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  } else if (entity.geometry.kind === "polygon") {
    shape = (
      <polygon
        {...common}
        points={entity.geometry.points.map((point) => point.join(",")).join(" ")}
        fill={tone.fill}
        stroke={selected ? "#0B1B3B" : tone.stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  } else if (entity.geometry.kind === "line") {
    const d = entity.geometry.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`).join(" ");
    shape = (
      <path
        {...common}
        d={d}
        fill="none"
        stroke={selected ? "#0B1B3B" : tone.stroke}
        strokeWidth={selected ? entity.geometry.thickness + 5 : entity.geometry.thickness}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    );
  } else {
    shape = (
      <circle
        {...common}
        cx={entity.geometry.x}
        cy={entity.geometry.y}
        r={selected ? entity.geometry.r + 5 : entity.geometry.r}
        fill={tone.fill}
        stroke={selected ? "#0B1B3B" : tone.stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  }

  return (
    <g key={entity.id}>
      {shape}
      {entity.geometry.kind !== "line" && entity.type !== "boundary" ? (
        <text
          x={labelX}
          y={labelY + 4}
          textAnchor="middle"
          className="pointer-events-none select-none fill-navy-950 text-[18px] font-bold"
        >
          {entity.label}
        </text>
      ) : null}
    </g>
  );
}

function Pipeline({ status }: { status: CadStatus }) {
  const currentIndex = CAD_PIPELINE.indexOf(status);
  return (
    <div className="grid gap-2 md:grid-cols-6">
      {CAD_PIPELINE.map((step, index) => {
        const done = currentIndex >= index;
        const active = currentIndex === index;
        return (
          <div
            key={step}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-semibold",
              done ? "border-gold-300 bg-gold-50 text-gold-800" : "border-slate-200 bg-white text-slate-500",
              active && "ring-2 ring-gold-300"
            )}
          >
            {STATUS_COPY[step]}
          </div>
        );
      })}
    </div>
  );
}

function LayerToggle({
  layer,
  hidden,
  onToggle
}: {
  layer: CadLayer;
  hidden: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(layer.id)}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all",
        hidden ? "border-slate-200 bg-white text-slate-400" : "border-slate-200 bg-slate-50 text-navy-950"
      )}
    >
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: layer.color }} />
        <span className="truncate">{layer.name}</span>
      </span>
      <span className="text-xs">{hidden ? "Off" : "On"}</span>
    </button>
  );
}

export function CadEngineDemo() {
  const [scenes, setScenes] = useState<CadScene[]>(SAMPLE_CAD_SCENES);
  const [activeSceneId, setActiveSceneId] = useState("cad-site-saldha-v1");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("cad-ent-plot-4");
  const [hiddenLayerIds, setHiddenLayerIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [uploadNote, setUploadNote] = useState("Drop a DWG, DXF, or vector PDF to start automatic extraction.");

  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  const selectedEntity = activeScene.entities.find((entity) => entity.id === selectedEntityId) ?? activeScene.entities[0];
  const filteredEntities = activeScene.entities.filter((entity) => {
    const haystack = `${entity.label} ${entity.type} ${entity.sourceHandle}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const breadcrumbs = useMemo(() => {
    const chain: CadScene[] = [];
    let cursor: CadScene | undefined = activeScene;
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentId ? scenes.find((scene) => scene.id === cursor?.parentId) : undefined;
    }
    return chain;
  }, [activeScene, scenes]);

  function toggleLayer(layerId: string) {
    setHiddenLayerIds((current) =>
      current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]
    );
  }

  function confirmEntity(entityId: string) {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeScene.id
          ? {
              ...scene,
              entities: scene.entities.map((entity) =>
                entity.id === entityId ? { ...entity, confirmed: !entity.confirmed } : entity
              )
            }
          : scene
      )
    );
  }

  function publishScene() {
    const now = new Date().toISOString();
    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeScene.id
          ? {
              ...scene,
              status: "published",
              entities: scene.entities.map((entity) => ({ ...entity, published: entity.confirmed })),
              auditTrail: [
                { at: now, by: "Amit Kalra", text: "Reviewed CAD entities published to live project records." },
                ...scene.auditTrail
              ]
            }
          : scene
      )
    );
  }

  function simulateUpload(file?: File, parentEntity?: CadEntity) {
    const parent = parentEntity ?? selectedEntity;
    const isRoomLevel = activeScene.scope === "plot";
    const template = isRoomLevel
      ? scenes.find((scene) => scene.id === "cad-room-living-v1")!
      : scenes.find((scene) => scene.id === "cad-plot-a04-v1")!;
    const nextId = `${template.id}-upload-${Date.now()}`;
    const newScene: CadScene = {
      ...template,
      id: nextId,
      parentId: activeScene.id,
      parentEntityId: parent.id,
      title: `${parent.label} - Auto extracted CAD`,
      version: 1,
      status: "review_required",
      originalFileName: file?.name ?? (isRoomLevel ? "uploaded-room-services.pdf" : "uploaded-plot-layout.dxf"),
      storageKey: `cad/tenant-demo/${file?.name ?? nextId}`,
      entities: template.entities.map((entity, index) => ({
        ...entity,
        id: `${nextId}-entity-${index + 1}`,
        published: false
      })),
      issues: template.issues.map((issue, index) => ({ ...issue, id: `${nextId}-issue-${index + 1}` })),
      auditTrail: [
        {
          at: new Date().toISOString(),
          by: "CAD Engine",
          text: `Auto-extracted ${template.entities.length} entities from ${file?.name ?? "uploaded CAD"}.`
        }
      ]
    };
    setScenes((current) => [...current, newScene]);
    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeScene.id
          ? {
              ...scene,
              entities: scene.entities.map((entity) =>
                entity.id === parent.id ? { ...entity, childSceneId: nextId } : entity
              )
            }
          : scene
      )
    );
    setActiveSceneId(nextId);
    setSelectedEntityId(newScene.entities[0]?.id ?? "");
    setHiddenLayerIds([]);
    setUploadNote(`${file?.name ?? "CAD file"} processed. Review required before publish.`);
  }

  const confirmedCount = activeScene.entities.filter((entity) => entity.confirmed).length;
  const publishedCount = activeScene.entities.filter((entity) => entity.published).length;

  return (
    <section id="cad-engine" className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Automatic CAD engine</p>
            <h2 className="mt-2 section-title">Recursive CAD visualization and review</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Upload site, plot, or room CAD. The engine converts, parses, extracts entities, flags issues, and creates a publish-ready interactive scene.
            </p>
          </div>
          <label className="btn-gold cursor-pointer">
            <Upload size={16} /> Upload CAD/PDF
            <input
              type="file"
              accept=".dwg,.dxf,.pdf"
              className="sr-only"
              onChange={(event) => simulateUpload(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {breadcrumbs.map((scene, index) => (
                <button
                  key={scene.id}
                  onClick={() => {
                    setActiveSceneId(scene.id);
                    setSelectedEntityId(scene.entities[0]?.id ?? "");
                    setHiddenLayerIds([]);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium",
                    scene.id === activeScene.id ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                  )}
                >
                  {index > 0 ? <ChevronRight size={14} /> : null}
                  {scene.scope}: {scene.title}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="chip bg-white text-slate-700 ring-1 ring-slate-200">{activeScene.originalFileName}</span>
              <span className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200">{STATUS_COPY[activeScene.status]}</span>
              <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">v{activeScene.version}</span>
            </div>
          </div>
          <Pipeline status={activeScene.status} />
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <FileText className="mb-3 text-gold-600" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{activeScene.entities.length}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Detected entities</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <CheckCircle2 className="mb-3 text-emerald-600" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{confirmedCount}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirmed for publish</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <AlertTriangle className="mb-3 text-amber-500" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{activeScene.issues.length}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Review warnings</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <BadgeCheck className="mb-3 text-sky-600" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{publishedCount}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Published links</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_410px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#f8faf7] shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-navy-950">{activeScene.title}</p>
                <p className="text-xs text-slate-500">{uploadNote}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-outline px-3" onClick={() => setZoom((value) => Math.max(0.8, value - 0.1))}>
                  <ZoomOut size={16} />
                </button>
                <span className="min-w-14 text-center text-sm font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
                <button className="btn-outline px-3" onClick={() => setZoom((value) => Math.min(1.35, value + 0.1))}>
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <svg
                viewBox={`0 0 ${activeScene.viewBox.w} ${activeScene.viewBox.h}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                className="aspect-[4/3] w-full min-w-[760px] touch-manipulation bg-[linear-gradient(90deg,rgba(148,163,184,.18)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.18)_1px,transparent_1px)] bg-[length:42px_42px]"
                role="img"
                aria-label={`${activeScene.title} CAD visualization`}
              >
                {activeScene.entities.map((entity) =>
                  renderEntity(entity, entity.id === selectedEntity?.id, hiddenLayerIds, (nextEntity) => setSelectedEntityId(nextEntity.id))
                )}
              </svg>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review panel</p>
                <h3 className="mt-1 text-xl font-semibold text-navy-950">{selectedEntity?.label ?? "No entity selected"}</h3>
              </div>
              {selectedEntity ? (
                <span className={cn("chip ring-1", confidenceTone(selectedEntity.confidence))}>
                  {formatConfidence(selectedEntity.confidence)} {selectedEntity.confidence}%
                </span>
              ) : null}
            </div>

            {selectedEntity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Entity type</p>
                    <p className="font-semibold capitalize text-navy-950">{selectedEntity.type.replaceAll("_", " ")}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Measurement</p>
                    <p className="font-semibold text-navy-950">{entityMeasurement(selectedEntity)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Source layer</p>
                    <p className="font-semibold text-navy-950">{activeScene.layers.find((layer) => layer.id === selectedEntity.layerId)?.name}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Source handle</p>
                    <p className="font-semibold text-navy-950">{selectedEntity.sourceHandle}</p>
                  </div>
                </div>

                {selectedEntity.warnings?.length ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {selectedEntity.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-outline" onClick={() => confirmEntity(selectedEntity.id)}>
                    <FileCheck2 size={16} /> {selectedEntity.confirmed ? "Unconfirm" : "Confirm"}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => selectedEntity.childSceneId && setActiveSceneId(selectedEntity.childSceneId)}
                    disabled={!selectedEntity.childSceneId}
                  >
                    <MousePointerClick size={16} /> Open child CAD
                  </button>
                  <label className="btn-outline col-span-2 cursor-pointer">
                    <Upload size={16} /> Upload child CAD for {selectedEntity.label}
                    <input
                      type="file"
                      accept=".dwg,.dxf,.pdf"
                      className="sr-only"
                      onChange={(event) => simulateUpload(event.target.files?.[0], selectedEntity)}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 font-semibold text-navy-950">
                  <Layers3 size={17} /> CAD layers
                </h4>
                <button className="text-xs font-semibold text-gold-700" onClick={() => setHiddenLayerIds([])}>
                  Show all
                </button>
              </div>
              <div className="grid gap-2">
                {activeScene.layers.map((layer) => (
                  <LayerToggle key={layer.id} layer={layer} hidden={hiddenLayerIds.includes(layer.id)} onToggle={toggleLayer} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 font-semibold text-navy-950">
                  <BoxSelect size={17} /> Extracted entities
                </h4>
                <button className="text-xs font-semibold text-gold-700" onClick={publishScene}>
                  Publish confirmed
                </button>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="input pl-9"
                  placeholder="Search plots, rooms, utilities..."
                />
              </label>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                {filteredEntities.map((entity) => (
                  <button
                    key={entity.id}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-all",
                      entity.id === selectedEntity?.id ? "border-navy-900 bg-navy-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                    onClick={() => setSelectedEntityId(entity.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-navy-950">{entity.label}</p>
                        <p className="mt-1 text-xs capitalize text-slate-500">{entity.type.replaceAll("_", " ")}</p>
                      </div>
                      <span className={cn("chip ring-1", confidenceTone(entity.confidence))}>{entity.confidence}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold text-navy-950">Review issues</h4>
                <button className="text-xs font-semibold text-slate-500" onClick={() => setActiveSceneId("cad-site-saldha-v1")}>
                  <RotateCcw size={14} className="inline" /> Root
                </button>
              </div>
              <div className="space-y-2">
                {activeScene.issues.length ? (
                  activeScene.issues.map((issue) => (
                    <div key={issue.id} className="rounded-lg bg-white p-3 text-sm">
                      <p className="font-semibold text-navy-950">{issue.title}</p>
                      <p className="mt-1 text-slate-600">{issue.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No extraction warnings on this CAD version.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
