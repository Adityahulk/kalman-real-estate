"use client";

import { Loader2, MessageSquareText, RefreshCcw, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { CadModeHeader } from "../cad-mode-header";

type StudioState = {
  selectedHandles?: string[];
  hiddenLayers?: string[];
  activeLayout?: string | null;
};

type LayerRole =
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

type StudioLayer = {
  name: string;
  color?: string;
  visible: boolean;
  suggestedRole?: LayerRole;
};

type StudioEvent = {
  type: string;
  state?: StudioState;
  message?: string;
  handles?: string[];
  layoutName?: string;
  empty?: boolean;
  layers?: StudioLayer[];
};

type StudioOverlay = {
  id: string;
  kind: string;
  label: string | null;
  sourceHandle: string | null;
  metadata: unknown;
  updatedAt: string;
};

export function CadStudio({
  cadFile,
  initialState,
  initialOverlays,
  hasScene,
  headerActions,
}: {
  cadFile: {
    id: string;
    originalName: string;
    version: number;
    status: string;
    projectId: string | null;
    format: string;
  };
  initialState: StudioState | null;
  initialOverlays: StudioOverlay[];
  hasScene: boolean;
  headerActions?: ReactNode;
}) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const source = useRef<{ bytes: ArrayBuffer; checksum: string } | null>(null);
  const state = useRef<StudioState>(initialState ?? {});
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(hasScene ? "Drawing ready" : "Preparing drawing extraction");
  const [error, setError] = useState("");
  const [selectedHandles, setSelectedHandles] = useState<string[]>(initialState?.selectedHandles ?? []);
  const [overlays, setOverlays] = useState(initialOverlays);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [overlaySaving, setOverlaySaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const [layerRoles, setLayerRoles] = useState<Record<string, LayerRole>>({});
  const [mappingOpen, setMappingOpen] = useState(!hasScene);

  useEffect(() => {
    let active = true;
    async function loadSource() {
      try {
        const response = await fetch(`/api/v1/cad/${cadFile.id}/source`, { cache: "no-store" });
        if (!response.ok) throw new Error(await responseMessage(response, "Could not load the original CAD file."));
        const bytes = await response.arrayBuffer();
        const checksum = response.headers.get("x-cad-source-sha256");
        if (!checksum) throw new Error("The drawing checksum is unavailable.");
        if (!active) return;
        source.current = { bytes, checksum };
        openDrawing();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not open CAD Studio.");
      }
    }
    function onMessage(event: MessageEvent<StudioEvent>) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data.type === "kalman:studio-mounted") openDrawing();
      if (event.data.type === "kalman:studio-shell-ready") {
        setReady(true);
        setNotice("Opening drawing");
      }
      if (event.data.type === "kalman:studio-ready") {
        setReady(true);
        setNotice("Drawing ready");
        if (initialState) sendCommand("restore", initialState);
      }
      if (event.data.type === "kalman:studio-state" && event.data.state) {
        state.current = event.data.state;
        setSelectedHandles(event.data.state.selectedHandles ?? []);
        window.sessionStorage.setItem(sessionKey(cadFile.id), JSON.stringify(event.data.state));
      }
      if (event.data.type === "kalman:studio-selection") setSelectedHandles(event.data.handles ?? []);
      if (event.data.type === "kalman:studio-layout") {
        setNotice(event.data.empty
          ? `${event.data.layoutName ?? "This layout"} contains no directly renderable paper-space entities. Use Model to view the project drawing.`
          : `${event.data.layoutName ?? "Layout"} ready`);
      }
      if (event.data.type === "kalman:studio-layers") {
        const nextLayers = Array.isArray(event.data.layers) ? event.data.layers : [];
        setLayers(nextLayers);
        setLayerRoles((current) => {
          if (Object.keys(current).length) return current;
          return Object.fromEntries(nextLayers.map((layer) => [layer.name, layer.suggestedRole ?? defaultLayerRole(layer.name)]));
        });
        if (!hasScene) {
          setMappingOpen(true);
          setNotice("Map layers before building review records");
        }
      }
      if (event.data.type === "kalman:studio-extraction-progress") setNotice(event.data.message ?? "Preparing review records");
      if (event.data.type === "kalman:studio-extraction-complete") {
        setExtracting(false);
        setNotice("Review records are ready");
        router.refresh();
      }
      if (event.data.type === "kalman:studio-extraction-error") {
        setExtracting(false);
        setError(event.data.message ?? "Drawing extraction failed.");
      }
    }
    window.addEventListener("message", onMessage);
    void loadSource();
    return () => {
      active = false;
      window.removeEventListener("message", onMessage);
    };
  // The drawing is immutable for the lifetime of this route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadFile.id]);

  function openDrawing() {
    if (!source.current || !frame.current?.contentWindow) return;
    const bytes = source.current.bytes.slice(0);
    frame.current.contentWindow.postMessage({
      type: "kalman:studio-open",
      bytes,
      fileName: cadFile.originalName,
      cadFileId: cadFile.id,
      sourceSha256: source.current.checksum,
        autoExtract: false,
    }, window.location.origin, [bytes]);
  }

  function sendCommand(command: string, payload?: unknown) {
    frame.current?.contentWindow?.postMessage({
      type: "kalman:studio-command",
      command,
      payload,
    }, window.location.origin);
  }

  async function saveState() {
    setSaving(true);
    setError("");
    sendCommand("get-state");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    const response = await fetch(`/api/v1/cad/${cadFile.id}/overlays`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "VIEW_STATE",
        label: "CAD Studio workspace",
        metadata: state.current,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setError(await responseMessage(response, "Could not save the CAD workspace."));
      return;
    }
    setNotice("Workspace saved");
  }

  function rebuildExtraction() {
    setMappingOpen(true);
    setNotice("Confirm layer categories before rebuilding plots");
  }

  function startExtraction() {
    if (hasScene && !window.confirm("Rebuild the plot and site-asset extraction from this original drawing? Existing draft review candidates will be replaced; published business records are not changed.")) return;
    setExtracting(true);
    setError("");
    setMappingOpen(false);
    setNotice("Reconstructing mapped plot and site polygons");
    sendCommand("extract", { layerRoles: cleanLayerRoles(layerRoles, layers) });
  }

  async function saveOverlay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setOverlaySaving(true);
    setError("");
    const response = await fetch(`/api/v1/cad/${cadFile.id}/overlays`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: String(form.get("kind") ?? "NOTE"),
        label: String(form.get("label") ?? "").trim(),
        sourceHandle: selectedHandles[0],
        metadata: { detail: String(form.get("detail") ?? "").trim() },
      }),
    });
    const body = await response.json().catch(() => null);
    setOverlaySaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Could not save the CAD overlay.");
      return;
    }
    setOverlays((current) => [body.data, ...current]);
    event.currentTarget.reset();
    setNotice("Overlay saved");
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#10151c]">
      <CadModeHeader
        cadFileId={cadFile.id}
        drawingName={cadFile.originalName}
        version={cadFile.version}
        status={cadFile.status}
        projectId={cadFile.projectId}
        activeMode="studio"
        format={cadFile.format}
        actions={(
          <div className="hidden items-center gap-2 sm:flex">
            <button className="btn-outline h-9 px-3" onClick={() => setOverlaysOpen(true)}>
              <MessageSquareText size={15} />
              Overlays
            </button>
            <button className="btn-outline h-9 px-3" onClick={saveState} disabled={!ready || saving}>
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              Save workspace
            </button>
            {cadFile.status !== "PUBLISHED" ? (
              <button className="btn-primary h-9 px-3" onClick={rebuildExtraction} disabled={!ready || extracting}>
                {extracting ? <Loader2 className="animate-spin" size={15} /> : <RefreshCcw size={15} />}
                Map & rebuild
              </button>
            ) : null}
            {headerActions}
          </div>
        )}
      />
      <div className="relative min-h-0 flex-1">
        <iframe
          ref={frame}
          className="h-full w-full border-0"
          src="/cad-runtime/studio.html"
          title={`CAD Studio: ${cadFile.originalName}`}
          allow="fullscreen"
        />
        {!ready && !error ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/80 text-white">
            <div className="text-center"><Loader2 className="mx-auto animate-spin" /><div className="mt-3 text-sm">{notice}</div></div>
          </div>
        ) : null}
        <div className={`absolute bottom-3 left-1/2 z-10 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md px-3 py-2 text-xs shadow-lg ${error ? "bg-rose-600 text-white" : "bg-slate-950/85 text-slate-100"}`}>
          {error || notice}
        </div>
        {mappingOpen && cadFile.status !== "PUBLISHED" ? (
          <LayerMappingPanel
            layers={layers}
            layerRoles={layerRoles}
            extracting={extracting}
            onChange={(name, role) => setLayerRoles((current) => ({ ...current, [name]: role }))}
            onClose={hasScene ? () => setMappingOpen(false) : undefined}
            onExtract={startExtraction}
          />
        ) : null}
      </div>
      {overlaysOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onMouseDown={() => setOverlaysOpen(false)}>
          <aside className="flex h-full w-full max-w-sm flex-col bg-white text-navy-950 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <div>
                <h2 className="font-semibold">Drawing overlays</h2>
                <p className="text-xs text-slate-500">{selectedHandles[0] ? `Selected handle ${selectedHandles[0]}` : "Select an entity to attach context"}</p>
              </div>
              <button className="btn-ghost h-9 w-9 px-0" onClick={() => setOverlaysOpen(false)}><X size={17} /></button>
            </div>
            <form className="shrink-0 space-y-3 border-b border-slate-200 p-4" onSubmit={saveOverlay}>
              <label className="block"><span className="label">Overlay type</span><select className="input" name="kind" defaultValue="NOTE"><option value="NOTE">Technical note</option><option value="ANNOTATION">Annotation</option><option value="MEASUREMENT">Saved measurement</option></select></label>
              <label className="block"><span className="label">Title</span><input className="input" name="label" required maxLength={240} placeholder="e.g. Verify road width" /></label>
              <label className="block"><span className="label">Details</span><textarea className="input min-h-24 resize-y py-2" name="detail" placeholder="Add the measurement, observation, or review context." /></label>
              <button className="btn-primary w-full justify-center" disabled={overlaySaving}>{overlaySaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save overlay</button>
            </form>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {overlays.map((overlay) => {
                const detail = overlay.metadata && typeof overlay.metadata === "object" && !Array.isArray(overlay.metadata)
                  ? String((overlay.metadata as Record<string, unknown>).detail ?? "")
                  : "";
                return (
                  <article key={overlay.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{overlay.kind.replaceAll("_", " ")}</span><span className="text-[11px] text-slate-400">{new Date(overlay.updatedAt).toLocaleDateString()}</span></div>
                    <div className="mt-1 text-sm font-medium">{overlay.label || "Untitled overlay"}</div>
                    {detail ? <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p> : null}
                    {overlay.sourceHandle ? <div className="mt-2 text-[11px] text-slate-400">CAD handle {overlay.sourceHandle}</div> : null}
                  </article>
                );
              })}
              {!overlays.length ? <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No saved annotations or measurements yet.</div> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function LayerMappingPanel({
  layers,
  layerRoles,
  extracting,
  onChange,
  onClose,
  onExtract,
}: {
  layers: StudioLayer[];
  layerRoles: Record<string, LayerRole>;
  extracting: boolean;
  onChange: (name: string, role: LayerRole) => void;
  onClose?: () => void;
  onExtract: () => void;
}) {
  const plotMapped = layers.some((layer) => layerRoles[layer.name] === "PLOT");
  const labelMapped = layers.some((layer) => layerRoles[layer.name] === "PLOT_LABEL");
  return (
    <aside className="absolute right-3 top-3 z-20 flex max-h-[calc(100%-5.5rem)] w-[420px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-navy-950 shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Layer mapping</div>
          <h2 className="mt-1 text-base font-semibold">Tell Kalman what each CAD layer means</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">These choices guide polygon parsing and label matching. Use Infer/shared for mixed linework; use Ignore for dimensions, title blocks, and legends.</p>
        </div>
        {onClose ? <button className="btn-ghost h-9 w-9 px-0" onClick={onClose}><X size={17} /></button> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!layers.length ? (
          <div className="rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500">Waiting for CAD layers...</div>
        ) : (
          <div className="space-y-2">
            {layers.map((layer) => (
              <label key={layer.name} className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-3 rounded-md border border-slate-200 p-2">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-slate-300" style={{ background: layer.color ?? "#e2e8f0" }} />
                    <span className="truncate text-sm font-medium">{layer.name}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{layer.visible ? "Visible" : "Hidden"} · Suggested: {roleLabel(layer.suggestedRole ?? defaultLayerRole(layer.name))}</span>
                </span>
                <select
                  className="input h-9 text-xs"
                  value={layerRoles[layer.name] ?? defaultLayerRole(layer.name)}
                  onChange={(event) => onChange(layer.name, event.target.value as LayerRole)}
                >
                  {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <StatusPill ok={plotMapped} label={plotMapped ? "Plot boundary mapped" : "Generic topology fallback"} />
          <StatusPill ok={labelMapped} label={labelMapped ? "Plot label mapped" : "Labels inferred from all usable text"} />
        </div>
        <button className="btn-primary w-full justify-center" onClick={onExtract} disabled={extracting || !layers.length}>
          {extracting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
          Build review records
        </button>
      </div>
    </aside>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`rounded-md px-2 py-1.5 ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {label}
    </div>
  );
}

const roleOptions: Array<{ value: LayerRole; label: string }> = [
  { value: "PLOT", label: "Plot boundary" },
  { value: "PLOT_LABEL", label: "Plot label text" },
  { value: "ROAD", label: "Road" },
  { value: "PARK", label: "Park / open space" },
  { value: "BOUNDARY", label: "Site boundary" },
  { value: "UTILITY", label: "Utility" },
  { value: "DRAINAGE", label: "Drainage" },
  { value: "ELECTRICAL_POINT", label: "Electrical" },
  { value: "GATE", label: "Gate / entry" },
  { value: "CLUBHOUSE", label: "Clubhouse" },
  { value: "IGNORE", label: "Ignore" },
  { value: "UNKNOWN", label: "Infer / shared geometry" },
];

function roleLabel(role: LayerRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? "Unknown";
}

function defaultLayerRole(name: string): LayerRole {
  const normalized = name.toUpperCase();
  if (/PLOT.?NO|PLOT.?NUM|PLOT.?ID|PLOT.*(?:TEXT|TXT|LABEL)|(?:^|[-_\s])P?NO(?:[-_\s]|$)|LABEL|NUMBER|NUMBERS/.test(normalized)) return "PLOT_LABEL";
  if (/PLOT|PARCEL|PCL\b|LOT\b|PROPERTY|SALE|UNIT.?BND|PL\b|PLT\b/.test(normalized)) return "PLOT";
  if (/ROAD|STREET|R\.?O\.?W\.?|ROW\b|RD\b|LANE|DRIVEWAY|CARRIAGE|PATHWAY|RASTA/.test(normalized)) return "ROAD";
  if (/PARK|GREEN|GARDEN|LANDSCAPE|OPEN.?SPACE|OPEN\b|OS\b|TOT.?LOT|AMENITY/.test(normalized)) return "PARK";
  if (/BOUNDARY|PERIMETER|BDY\b|BND\b|SITE.?B|COMPOUND|FENCE|EXTENT|LIMIT/.test(normalized)) return "BOUNDARY";
  if (/DRAIN|SEWER|STORM|SWD\b|S\.?W\.?D\.?/.test(normalized)) return "DRAINAGE";
  if (/ELECT|TRANSFORMER|RMU|MPB|HT\b|LT\b|POLE|CABLE|POWER|LIGHT|DB\b|PANEL/.test(normalized)) return "ELECTRICAL_POINT";
  if (/GATE|ENTRY|ENTRANCE|EXIT|ACCESS/.test(normalized)) return "GATE";
  if (/CLUB|COMMUNITY|SOCIETY|OFFICE/.test(normalized)) return "CLUBHOUSE";
  if (/DIM|DIMENSION|ANNO(?!.*PLOT)|TITLE|LEGEND|GRID|CENTER|CENTRE|AXIS|SECTION|DETAIL|REVISION|NORTH/.test(normalized)) return "IGNORE";
  return "UNKNOWN";
}

function cleanLayerRoles(layerRoles: Record<string, LayerRole>, layers: StudioLayer[]) {
  return Object.fromEntries(layers.map((layer) => [
    layer.name,
    layerRoles[layer.name] ?? layer.suggestedRole ?? defaultLayerRole(layer.name),
  ]));
}

function sessionKey(cadFileId: string) {
  return `kalman-cad-studio:${cadFileId}`;
}

async function responseMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}
