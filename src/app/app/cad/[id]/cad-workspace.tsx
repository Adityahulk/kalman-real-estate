"use client";

import { CadEntityType } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Focus,
  GitBranch,
  Layers3,
  Loader2,
  Maximize2,
  MousePointer2,
  RotateCcw,
  Search,
  Send,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { FormEvent, MouseEvent, PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

type Layer = {
  id: string;
  name: string;
  color: string | null;
  visible: boolean;
  purpose: string | null;
};

type Entity = {
  id: string;
  layerId: string | null;
  type: CadEntityType;
  label: string | null;
  confidence: string | number;
  geometry: Json;
  measurements: Json;
  status: string;
  sourceLayer: string | null;
  spatialLinks: Array<{
    id: string;
    recordType: string;
    recordId: string;
    linkConfidence: string | number;
  }>;
};

type Issue = {
  id: string;
  entityId: string | null;
  severity: string;
  code: string;
  message: string;
};

type Version = {
  id: string;
  version: number;
  status: string;
  publishedAt: string | Date | null;
};

type Scene = {
  id: string;
  bounds: Json;
  layers: Layer[];
  entities: Entity[];
};

type CadFile = {
  id: string;
  originalName: string;
  status: string;
  parentType: string;
  parentId: string;
  version: number;
  projectId: string | null;
  errorMessage: string | null;
};

type BusinessLink = {
  link: { recordType: string; recordId: string } | null;
  record: Record<string, unknown> | null;
};

const typeStyle: Record<string, { stroke: string; fill: string; label: string }> = {
  PLOT: { stroke: "#f4c542", fill: "rgba(244,197,66,0.22)", label: "Plot" },
  ROAD: { stroke: "#94a3b8", fill: "rgba(148,163,184,0.24)", label: "Road" },
  BOUNDARY: { stroke: "#e2e8f0", fill: "rgba(15,23,42,0.1)", label: "Boundary" },
  UTILITY: { stroke: "#38bdf8", fill: "rgba(56,189,248,0.18)", label: "Utility" },
  PARK: { stroke: "#22c55e", fill: "rgba(34,197,94,0.2)", label: "Park" },
  GATE: { stroke: "#f59e0b", fill: "rgba(245,158,11,0.22)", label: "Gate" },
  CLUBHOUSE: { stroke: "#a78bfa", fill: "rgba(167,139,250,0.22)", label: "Club" },
  DRAINAGE: { stroke: "#14b8a6", fill: "rgba(20,184,166,0.18)", label: "Drain" },
  ROOM: { stroke: "#60a5fa", fill: "rgba(96,165,250,0.18)", label: "Room" },
  BATHROOM: { stroke: "#06b6d4", fill: "rgba(6,182,212,0.22)", label: "Bath" },
  KITCHEN: { stroke: "#fb7185", fill: "rgba(251,113,133,0.2)", label: "Kitchen" },
  ELECTRICAL_POINT: { stroke: "#facc15", fill: "rgba(250,204,21,0.25)", label: "Electrical" },
  PLUMBING_LINE: { stroke: "#0ea5e9", fill: "rgba(14,165,233,0.18)", label: "Plumbing" },
  UNKNOWN: { stroke: "#f97316", fill: "rgba(249,115,22,0.14)", label: "Unknown" },
};

export function CadWorkspace({
  cadFile,
  scene,
  issues,
  versions,
}: {
  cadFile: CadFile;
  scene: Scene | null;
  issues: Issue[];
  versions: Version[];
}) {
  const router = useRouter();
  const viewport = useMemo(() => makeViewport(scene), [scene]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState(scene?.entities[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"review" | "live" | "compare">("review");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessLink, setBusinessLink] = useState<BusinessLink | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const visibleEntities = useMemo(() => {
    if (!scene) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return scene.entities.filter((entity) => {
      if (entity.layerId && hiddenLayers.has(entity.layerId)) return false;
      if (!normalizedQuery) return true;
      return `${entity.label ?? ""} ${entity.type} ${entity.sourceLayer ?? ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [hiddenLayers, query, scene]);

  const selected = scene?.entities.find((entity) => entity.id === selectedId) ?? visibleEntities[0] ?? null;
  const selectedIssues = selected ? issues.filter((issue) => issue.entityId === selected.id) : [];

  useEffect(() => {
    if (!selected) {
      setBusinessLink(null);
      return;
    }
    const hasLink = selected.spatialLinks.length > 0;
    if (!hasLink) {
      setBusinessLink(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/cad/entities/${selected.id}/link`)
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setBusinessLink(body.ok ? body.data : null);
      })
      .catch(() => {
        if (!cancelled) setBusinessLink(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function toggleLayer(id: string) {
    setHiddenLayers((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fit() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.1 : 0.1;
    setScale((current) => Math.min(5, Math.max(0.35, Number((current + direction).toFixed(2)))));
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest("[data-entity]")) return;
    setDrag({ x: event.clientX - offset.x, y: event.clientY - offset.y });
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    setOffset({ x: event.clientX - drag.x, y: event.clientY - drag.y });
  }

  function onPointerUp() {
    setDrag(null);
  }

  async function saveSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      entities: [
        {
          entityId: selected.id,
          label: String(form.get("label") ?? selected.label ?? ""),
          type: String(form.get("type") ?? selected.type),
          status: String(form.get("status") ?? selected.status),
        },
      ],
      resolvedIssueIds: selectedIssues.filter((issue) => form.get(`issue:${issue.id}`) === "on").map((issue) => issue.id),
    };
    const response = await fetch(`/api/v1/cad/${cadFile.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Selected entity review saved." : body.error ?? "Review failed");
    router.refresh();
  }

  async function publish() {
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/publish`, { method: "POST" });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Published ${body.data.plots.length} plots and ${body.data.assets.length} assets.` : body.error ?? "Publish failed");
    router.refresh();
  }

  async function retry() {
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/process/retry`, { method: "POST" });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "CAD processing has been queued again." : body.error ?? "Retry failed");
    router.refresh();
  }

  if (!scene) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            {cadFile.status === "FAILED" ? <AlertTriangle size={22} /> : <Loader2 className="animate-spin" size={22} />}
          </div>
          <h2 className="mt-4 text-xl font-semibold">{statusTitle(cadFile.status)}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{statusHelp(cadFile.status)}</p>
          {cadFile.errorMessage ? <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{cadFile.errorMessage}</div> : null}
          <div className="mt-6 grid gap-2 text-left text-sm md:grid-cols-5">
            {["UPLOADED", "CONVERTING", "PARSING", "EXTRACTING", "REVIEW_REQUIRED"].map((status) => (
              <div key={status} className={`rounded-lg border px-3 py-2 ${cadStatusRank(cadFile.status) >= cadStatusRank(status) ? "border-gold-300 bg-gold-50 text-navy-950" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                {status.replaceAll("_", " ")}
              </div>
            ))}
          </div>
          {message ? <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
          {cadFile.status === "FAILED" || cadFile.status === "UPLOADED" ? (
            <button className="btn-primary mt-6" onClick={retry} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RotateCcw size={17} />}
              Retry processing
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-2xl">
      <div className="flex min-h-[calc(100vh-9rem)] flex-col xl:grid xl:grid-cols-[280px_1fr_360px]">
        <aside className="border-b border-white/10 bg-slate-900/95 p-4 text-white xl:border-b-0 xl:border-r">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">CAD Workspace</div>
            <h2 className="mt-1 truncate text-lg font-semibold">{cadFile.originalName}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip bg-white/10 text-slate-200">{cadFile.status.replaceAll("_", " ")}</span>
              <span className="chip bg-white/10 text-slate-200">v{cadFile.version}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 text-xs">
            {(["review", "live", "compare"] as const).map((item) => (
              <button
                key={item}
                className={`px-2 py-2 capitalize ${mode === item ? "bg-gold-shine text-navy-950" : "bg-slate-950 text-slate-300 hover:bg-white/10"}`}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><Search size={14} /> Search</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-gold-400 focus:ring-1"
              placeholder="Plot, layer, utility..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
              <span className="flex items-center gap-2"><Layers3 size={14} /> Layers</span>
              <span>{scene.layers.length}</span>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {scene.layers.map((layer) => {
                const hidden = hiddenLayers.has(layer.id);
                const count = scene.entities.filter((entity) => entity.layerId === layer.id || entity.sourceLayer === layer.name).length;
                return (
                  <button
                    key={layer.id}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${hidden ? "border-white/5 bg-slate-950/60 text-slate-500" : "border-white/10 bg-white/5 text-slate-100"}`}
                    onClick={() => toggleLayer(layer.id)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{layer.name}</span>
                      <span className="text-xs text-slate-500">{layer.purpose ?? "Unclassified"} · {count}</span>
                    </span>
                    {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
              <span className="flex items-center gap-2"><AlertTriangle size={14} /> Review Queue</span>
              <span>{issues.length}</span>
            </div>
            <div className="max-h-48 space-y-2 overflow-auto pr-1">
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  className="w-full rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-left text-xs text-amber-100"
                  onClick={() => issue.entityId && setSelectedId(issue.entityId)}
                >
                  <span className="font-medium">{issue.code}</span>
                  <span className="mt-1 block text-amber-100/80">{issue.message}</span>
                </button>
              ))}
              {!issues.length ? <div className="rounded-lg bg-white/5 p-3 text-xs text-slate-400">No unresolved warnings.</div> : null}
            </div>
          </div>
        </aside>

        <section className="relative min-h-[620px] overflow-hidden bg-[#020617]">
          <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/80 p-1 text-white backdrop-blur">
              <ToolbarButton label="Zoom in" onClick={() => setScale((value) => Math.min(5, value + 0.2))}><ZoomIn size={16} /></ToolbarButton>
              <ToolbarButton label="Zoom out" onClick={() => setScale((value) => Math.max(0.35, value - 0.2))}><ZoomOut size={16} /></ToolbarButton>
              <ToolbarButton label="Fit" onClick={fit}><Maximize2 size={16} /></ToolbarButton>
              <ToolbarButton label="Reset" onClick={fit}><RotateCcw size={16} /></ToolbarButton>
              <span className="px-2 text-xs text-slate-300">{Math.round(scale * 100)}%</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 backdrop-blur">
              {visibleEntities.length} visible / {scene.entities.length} extracted
            </div>
          </div>

          <svg
            ref={svgRef}
            className="h-full min-h-[620px] w-full cursor-grab touch-none active:cursor-grabbing"
            viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <defs>
              <pattern id="cad-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              </pattern>
              <filter id="selected-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f4c542" floodOpacity="0.9" />
              </filter>
            </defs>
            <rect width={viewport.width} height={viewport.height} fill="#020617" />
            <rect width={viewport.width} height={viewport.height} fill="url(#cad-grid)" />
            <g transform={`translate(${offset.x} ${offset.y}) scale(${scale}) translate(${viewport.pad} ${viewport.pad})`}>
              {visibleEntities.map((entity) => (
                <EntityShape
                  key={entity.id}
                  entity={entity}
                  viewport={viewport}
                  selected={entity.id === selected?.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(entity.id);
                  }}
                />
              ))}
            </g>
          </svg>

          <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-slate-950/80 p-3 text-white backdrop-blur">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Minimap</div>
            <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="h-28 w-44 rounded bg-slate-900">
              {visibleEntities.map((entity) => (
                <EntityShape key={entity.id} entity={entity} viewport={viewport} minimap selected={entity.id === selected?.id} />
              ))}
            </svg>
          </div>
        </section>

        <aside className="border-t border-white/10 bg-white p-4 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Selected Entity</div>
              <h2 className="mt-1 text-lg font-semibold">{selected?.label ?? selected?.type ?? "Nothing selected"}</h2>
            </div>
            <MousePointer2 className="text-slate-400" size={20} />
          </div>

          {selected ? (
            <form onSubmit={saveSelected} className="mt-5 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Type" value={selected.type.replaceAll("_", " ")} />
                  <Info label="Status" value={selected.status} />
                  <Info label="Layer" value={selected.sourceLayer ?? "Unknown"} />
                  <Info label="Confidence" value={`${Math.round(Number(selected.confidence) * 100)}%`} />
                  <Info label="Area" value={measurement(selected.measurements, "areaSqft")} />
                  <Info label="Length" value={measurement(selected.measurements, "length")} />
                </div>
              </div>

              <label className="block">
                <span className="label">Label</span>
                <input className="input" name="label" defaultValue={selected.label ?? ""} />
              </label>
              <label className="block">
                <span className="label">Entity type</span>
                <select className="input" name="type" defaultValue={selected.type}>
                  {Object.values(CadEntityType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Review status</span>
                <select className="input" name="status" defaultValue={selected.status}>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="SUGGESTED">SUGGESTED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </label>

              {selectedIssues.length ? (
                <div className="rounded-lg bg-amber-50 p-3">
                  <div className="text-sm font-medium text-amber-900">Warnings for this entity</div>
                  <div className="mt-2 space-y-2">
                    {selectedIssues.map((issue) => (
                      <label key={issue.id} className="flex items-start gap-2 text-sm text-amber-800">
                        <input className="mt-1" name={`issue:${issue.id}`} type="checkbox" />
                        <span>{issue.message}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}

              <BusinessRecordPanel cadFile={cadFile} selected={selected} businessLink={businessLink} />

              <div className="grid grid-cols-2 gap-3">
                <button className="btn-primary" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
                  Save
                </button>
                <button type="button" className="btn-gold" onClick={publish} disabled={loading}>
                  <Send size={17} />
                  Publish
                </button>
              </div>
              <Link
                className="btn-outline w-full"
                href={childCadHref(cadFile, selected, businessLink)}
              >
                <Focus size={17} />
                Upload child CAD for this {selected.type.replaceAll("_", " ").toLowerCase()}
              </Link>
            </form>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Click an entity on the CAD map to inspect it.
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><GitBranch size={16} /> Versions</div>
            <div className="space-y-2">
              {versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>v{version.version}</span>
                  <span className="text-slate-500">{version.status}</span>
                </div>
              ))}
              {!versions.length ? <div className="text-sm text-slate-500">No published version yet.</div> : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function childScopeFor(type: CadEntityType) {
  if (type === "PLOT") return "PLOT";
  if (type === "ROOM" || type === "KITCHEN" || type === "BATHROOM") return "ROOM";
  return "SITE_ASSET";
}

function childCadHref(cadFile: CadFile, selected: Entity, businessLink: BusinessLink | null) {
  const linked = businessLink?.link;
  if (linked?.recordType === "Plot" && cadFile.projectId) return `/app/projects/${cadFile.projectId}/plots/${linked.recordId}?tab=child-cad`;
  const parentType = linked?.recordType === "Plot" ? "PLOT" : linked?.recordType === "SiteAsset" ? "SITE_ASSET" : childScopeFor(selected.type);
  const parentId = linked?.recordId ?? selected.id;
  return cadFile.projectId
    ? `/app/projects/${cadFile.projectId}/cad?parentType=${parentType}&parentId=${parentId}`
    : `/app/cad?parentType=${parentType}&parentId=${parentId}`;
}

function BusinessRecordPanel({ cadFile, selected, businessLink }: { cadFile: CadFile; selected: Entity; businessLink: BusinessLink | null }) {
  const link = businessLink?.link ?? selected.spatialLinks[0] ?? null;
  if (!link) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
        This entity is not published into a live business record yet.
      </div>
    );
  }

  const record = businessLink?.record ?? {};
  const href =
    link.recordType === "Plot" && cadFile.projectId
      ? `/app/projects/${cadFile.projectId}/plots/${link.recordId}`
      : link.recordType === "SiteAsset" && cadFile.projectId
        ? `/app/projects/${cadFile.projectId}/development`
        : link.recordType === "ChecklistItem" && cadFile.projectId && typeof record.plotId === "string"
          ? `/app/projects/${cadFile.projectId}/plots/${record.plotId}?tab=development`
          : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">Live record</div>
      <div className="mt-1 font-medium">{link.recordType}</div>
      {link.recordType === "Plot" ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <Info label="Plot" value={String(record.code ?? record.label ?? link.recordId)} />
          <Info label="Status" value={String(record.status ?? "-")} />
          <Info label="Owner" value={String((record.currentOwner as Record<string, unknown> | undefined)?.name ?? "Company")} />
          <Info label="Documents" value={String(record.documentCount ?? 0)} />
        </div>
      ) : null}
      {href ? <Link className="btn-primary mt-3 h-9 w-full px-3 text-xs" href={href}>Open {link.recordType.toLowerCase()} workspace</Link> : null}
    </div>
  );
}

function statusTitle(status: string) {
  if (status === "FAILED") return "CAD processing failed";
  if (status === "UPLOADED") return "CAD uploaded and queued";
  if (status === "CONVERTING") return "Converting CAD";
  if (status === "PARSING") return "Parsing CAD geometry";
  if (status === "EXTRACTING") return "Extracting plots and site assets";
  return "Preparing CAD scene";
}

function statusHelp(status: string) {
  if (status === "FAILED") return "The original file is saved. Fix the issue below and retry processing.";
  if (status === "UPLOADED") return "The file is stored and waiting for the CAD worker. This screen will show the map once extraction finishes.";
  if (status === "CONVERTING") return "The CAD worker is preparing the file for geometry extraction.";
  if (status === "PARSING") return "Layers, polylines, labels, and dimensions are being parsed.";
  if (status === "EXTRACTING") return "The system is classifying plots, roads, boundaries, utilities, and labels.";
  return "The visualization is being prepared.";
}

function cadStatusRank(status: string) {
  return ["UPLOADED", "CONVERTING", "PARSING", "EXTRACTING", "REVIEW_REQUIRED", "PUBLISHED"].indexOf(status);
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={label} className="rounded-md p-2 text-slate-200 hover:bg-white/10 hover:text-white" onClick={onClick}>
      {children}
    </button>
  );
}

function EntityShape({
  entity,
  viewport,
  selected,
  minimap = false,
  onClick,
}: {
  entity: Entity;
  viewport: ReturnType<typeof makeViewport>;
  selected: boolean;
  minimap?: boolean;
  onClick?: (event: MouseEvent<SVGGElement>) => void;
}) {
  const style = typeStyle[entity.type] ?? typeStyle.UNKNOWN;
  const geometry = entity.geometry && typeof entity.geometry === "object" ? entity.geometry as Record<string, unknown> : {};
  const points = extractPoints(geometry);
  const mapped = points.map(([x, y]) => [x - viewport.minX, viewport.maxY - y] as [number, number]);
  const strokeDasharray = Number(entity.confidence) < 0.55 || entity.status === "SUGGESTED" ? "8 6" : undefined;
  const opacity = entity.status === "REJECTED" ? 0.28 : 1;
  const strokeWidth = minimap ? 3 : selected ? 3.2 : 1.7;
  const filter = selected && !minimap ? "url(#selected-glow)" : undefined;

  if (!mapped.length) return null;

  const textPoint = mapped[0];
  const isClosed = geometry.closed === true || geometry.type === "rect" || mapped.length > 2;
  const path = isClosed
    ? `M ${mapped.map((point) => point.join(" ")).join(" L ")} Z`
    : `M ${mapped.map((point) => point.join(" ")).join(" L ")}`;

  return (
    <g data-entity={entity.id} onClick={onClick} className="cursor-pointer" opacity={opacity} filter={filter}>
      <path
        d={path}
        fill={isClosed ? style.fill : "none"}
        stroke={selected ? "#f8fafc" : style.stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!minimap && (
        <>
          <circle cx={textPoint[0]} cy={textPoint[1]} r={selected ? 4 : 2.5} fill={selected ? "#f8fafc" : style.stroke} />
          <text x={textPoint[0] + 7} y={textPoint[1] - 7} fill="#e2e8f0" fontSize="12" paintOrder="stroke" stroke="#020617" strokeWidth="4">
            {entity.label ?? style.label}
          </text>
          <text x={textPoint[0] + 7} y={textPoint[1] + 8} fill="#94a3b8" fontSize="9" paintOrder="stroke" stroke="#020617" strokeWidth="3">
            {style.label} · {Math.round(Number(entity.confidence) * 100)}%
          </text>
        </>
      )}
    </g>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate font-medium text-navy-950">{value}</div>
    </div>
  );
}

function measurement(value: Json, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "-";
  const raw = (value as Record<string, unknown>)[key];
  if (typeof raw !== "number") return "-";
  return `${Math.round(raw).toLocaleString("en-IN")}${key === "areaSqft" ? " sq ft" : ""}`;
}

function extractPoints(geometry: Record<string, unknown>): [number, number][] {
  const rawPoints = geometry.points;
  if (Array.isArray(rawPoints)) {
    return rawPoints
      .filter((point): point is [number, number] => Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number")
      .map((point) => [point[0], point[1]]);
  }
  const rawPoint = geometry.point;
  if (Array.isArray(rawPoint) && typeof rawPoint[0] === "number" && typeof rawPoint[1] === "number") {
    return [[rawPoint[0], rawPoint[1]]];
  }
  return [];
}

function makeViewport(scene: Scene | null) {
  const allPoints = scene?.entities.flatMap((entity) => {
    const geometry = entity.geometry && typeof entity.geometry === "object" ? entity.geometry as Record<string, unknown> : {};
    return extractPoints(geometry);
  }) ?? [];
  const xs = allPoints.map((point) => point[0]);
  const ys = allPoints.map((point) => point[1]);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1000);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 700);
  const pad = 80;
  return {
    minX,
    maxX,
    minY,
    maxY,
    pad,
    width: Math.max(900, maxX - minX + pad * 2),
    height: Math.max(620, maxY - minY + pad * 2),
  };
}
