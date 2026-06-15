"use client";

import { CadEntityType } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
  Layers3,
  Loader2,
  MapPinned,
  RefreshCcw,
  Ruler,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CadMap, CadMapEntity } from "./cad-map";
import { MlightCadMap } from "./mlightcad/mlightcad-map";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
type Region = { x: number; y: number; width: number; height: number };
type Layer = { id: string; name: string; color: string | null; visible: boolean; purpose: string | null; metadata?: Json };
type Entity = CadMapEntity & {
  confidence: string | number;
  measurements: Json;
  validation: Json;
  sourceHandle: string | null;
  sourceLayer: string | null;
  spatialLinks: Array<{ id: string; recordType: string; recordId: string; linkConfidence: string | number }>;
};
type Issue = {
  id: string;
  entityId: string | null;
  severity: string;
  code: string;
  message: string;
  blocking: boolean;
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
  format: string;
  status: string;
  parentType: string;
  parentId: string;
  version: number;
  projectId: string | null;
  errorMessage: string | null;
  processingLog: Json;
};
type Analysis = {
  discipline: string;
  sourceKind: string | null;
  pageNumber: number;
  proposedRegion: Json;
  confirmedRegion: Json;
  excludedRegions: Json;
  expectedCounts: Json;
  scaleCalibration: Json;
  inspection: Json;
  setupConfirmedAt: string | Date | null;
  calibrationConfirmedAt: string | Date | null;
  previewArtifactKey: string | null;
};
type Version = { id: string; version: number; status: string; publishedAt: string | Date | null };

export function CadWorkspace({
  cadFile,
  analysis,
  scene,
  issues,
  versions,
}: {
  cadFile: CadFile;
  analysis: Analysis | null;
  scene: Scene | null;
  issues: Issue[];
  versions: Version[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(cadFile.status);
  const [errorMessage, setErrorMessage] = useState(cadFile.errorMessage);
  const initialProcessing = objectValue(cadFile.processingLog);
  const [processingStage, setProcessingStage] = useState(typeof initialProcessing.stage === "string" ? initialProcessing.stage : null);
  const [progressLabel, setProgressLabel] = useState(typeof initialProcessing.progressLabel === "string" ? initialProcessing.progressLabel : null);
  const [elapsedMs, setElapsedMs] = useState(Number(initialProcessing.elapsedMs ?? 0));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(cadFile.status);
    setErrorMessage(cadFile.errorMessage);
  }, [cadFile.errorMessage, cadFile.status]);

  useEffect(() => {
    if (["SETUP_REQUIRED", "CALIBRATION_REQUIRED", "REVIEW_REQUIRED", "PUBLISHED", "FAILED"].includes(status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/v1/cad/${cadFile.id}/status`);
      const body = await response.json().catch(() => null);
      if (!body?.ok) return;
      setStatus(body.data.status);
      setErrorMessage(body.data.errorMessage);
      setProcessingStage(body.data.stage);
      setProgressLabel(body.data.progressLabel);
      setElapsedMs(Number(body.data.elapsedMs ?? 0));
      if (["SETUP_REQUIRED", "CALIBRATION_REQUIRED", "REVIEW_REQUIRED", "PUBLISHED", "FAILED"].includes(body.data.status)) router.refresh();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [cadFile.id, router, status]);

  useEffect(() => {
    if (["SETUP_REQUIRED", "CALIBRATION_REQUIRED", "REVIEW_REQUIRED", "PUBLISHED", "FAILED"].includes(status)) return;
    const timer = window.setInterval(() => setElapsedMs((current) => current + 1000), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  async function retry() {
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/process/retry`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setLoading(false);
    setMessage(response.ok ? "Map processing started again." : body?.error ?? "Retry failed.");
    if (response.ok) {
      setStatus("UPLOADED");
      router.refresh();
    }
  }

  const browserCad = cadFile.format === "DXF" || cadFile.format === "DWG";
  if (browserCad && !scene && !["CALIBRATION_REQUIRED", "REVIEW_REQUIRED", "PUBLISHED", "FAILED"].includes(status)) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <StatePanel icon={<FileSearch size={24} />} title="Open CAD Studio to prepare review records" detail="The original DXF/DWG is visualized and parsed inside the dedicated CAD Studio. Review records appear here after browser extraction completes.">
          <Link className="btn-primary" href={`/app/cad/${cadFile.id}/studio`}>Open CAD Studio</Link>
        </StatePanel>
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="h-full overflow-y-auto p-4"><StatePanel icon={<AlertTriangle size={24} />} title="Map processing stopped" detail={errorMessage ?? "Map processing could not inspect this drawing."}>
        <button className="btn-primary" onClick={retry} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCcw size={17} />}
          Retry safely
        </button>
      </StatePanel></div>
    );
  }

  if (!analysis || !["SETUP_REQUIRED", "CALIBRATION_REQUIRED", "REVIEW_REQUIRED", "PUBLISHED"].includes(status)) {
    return (
      <div className="h-full overflow-y-auto p-4"><StatePanel icon={<Loader2 className="animate-spin" size={24} />} title={progressLabel ?? statusTitle(status)} detail={statusHelp(status)}>
        <div className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-md bg-slate-50 px-4 py-2 text-xs text-slate-600">
          <span>{processingStage?.replaceAll("_", " ") ?? status.replaceAll("_", " ")}</span>
          <span className="h-3 w-px bg-slate-300" />
          <span>{formatElapsed(elapsedMs)}</span>
        </div>
        <ProcessingSteps status={status} />
        {message ? <Notice text={message} /> : null}
      </StatePanel></div>
    );
  }

  if (status === "SETUP_REQUIRED") {
    return <div className="h-full overflow-y-auto p-4"><DrawingSetup cadFile={cadFile} analysis={analysis} /></div>;
  }

  if (status === "CALIBRATION_REQUIRED") {
    return <div className="h-full overflow-y-auto p-4"><Calibration cadFile={cadFile} analysis={analysis} scene={scene} /></div>;
  }

  return (
    <CandidateReview
      cadFile={{ ...cadFile, status }}
      analysis={analysis}
      scene={scene}
      issues={issues}
      versions={versions}
    />
  );
}

function DrawingSetup({ cadFile, analysis }: { cadFile: CadFile; analysis: Analysis }) {
  const router = useRouter();
  const initial = regionValue(analysis.confirmedRegion) ?? regionValue(analysis.proposedRegion) ?? { x: 0, y: 0, width: 1, height: 1 };
  const [region, setRegion] = useState(initial);
  const [discipline, setDiscipline] = useState(analysis.discipline === "AUTO" ? "MIXED" : analysis.discipline);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const expected = objectValue(analysis.expectedCounts);
  const [expectedCounts, setExpectedCounts] = useState({
    total: String(expected.total ?? ""),
    residential: String(expected.residential ?? ""),
    commercial: String(expected.commercial ?? ""),
    ews: String(expected.ews ?? ""),
  });
  const inspection = objectValue(analysis.inspection);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/cad/${cadFile.id}/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        discipline,
        region,
        excludedRegions: Array.isArray(analysis.excludedRegions) ? analysis.excludedRegions : [],
        expectedCounts: Object.fromEntries(
          Object.entries(expectedCounts)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => [key, Number(value)]),
        ),
      }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Could not start extraction.");
      return;
    }
    setMessage("Drawing setup confirmed. Safe candidate extraction is running.");
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-card">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Step 1 of 3</div>
            <h2 className="mt-1 font-semibold">Confirm the actual site drawing</h2>
          </div>
          <span className="chip bg-white/10 text-white">{analysis.sourceKind?.replaceAll("_", " ")}</span>
        </div>
        <div className="relative max-h-[72vh] overflow-auto bg-slate-800 p-4">
          {analysis.previewArtifactKey ? (
            <div className="relative mx-auto w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="block max-h-[68vh] max-w-full select-none object-contain" src={`/api/v1/cad/${cadFile.id}/preview`} alt="Map source preview" />
              <div
                className="pointer-events-none absolute border-2 border-gold-400 bg-gold-400/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.52)]"
                style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}
              />
            </div>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center text-sm text-slate-300">Vector drawing detected. The full drawing extent will be used.</div>
          )}
        </div>
      </section>

      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2"><FileSearch size={18} /><h2 className="font-semibold">Drawing setup</h2></div>
          <label className="mt-4 block">
            <span className="label">Drawing type</span>
            <select className="input" value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
              <option value="MIXED">Site layout + electrical</option>
              <option value="SITE_LAYOUT">Site layout</option>
              <option value="ELECTRICAL">Electrical plan</option>
              <option value="ARCHITECTURAL">Architectural plan</option>
            </select>
          </label>
          {analysis.previewArtifactKey ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <RegionInput label="Left" value={region.x} allowZero onChange={(value) => setRegion((current) => ({ ...current, x: Math.min(value, 1 - current.width) }))} />
              <RegionInput label="Top" value={region.y} allowZero onChange={(value) => setRegion((current) => ({ ...current, y: Math.min(value, 1 - current.height) }))} />
              <RegionInput label="Width" value={region.width} onChange={(value) => setRegion((current) => ({ ...current, width: Math.min(value, 1 - current.x) }))} />
              <RegionInput label="Height" value={region.height} onChange={(value) => setRegion((current) => ({ ...current, height: Math.min(value, 1 - current.y) }))} />
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="font-semibold">Detected drawing facts</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Pages" value={String(inspection.pageCount ?? 1)} />
            <Metric label="Vector paths" value={String(firstPageValue(inspection, "vectorPathCount") ?? 0)} />
            <Metric label="Total plots stated" value={String(expected.total ?? "Not found")} />
            <Metric label="Residential" value={String(expected.residential ?? "Not found")} />
            <Metric label="Commercial" value={String(expected.commercial ?? "Not found")} />
            <Metric label="EWS" value={String(expected.ews ?? "Not found")} />
          </dl>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="text-sm font-medium">Confirm schedule counts</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Correct these values if OCR could not read the drawing schedule. They become a blocking publish reconciliation check.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {Object.entries(expectedCounts).map(([key, value]) => (
                <label key={key}><span className="label capitalize">{key}</span><input className="input" type="number" min="0" value={value} onChange={(event) => setExpectedCounts((current) => ({ ...current, [key]: event.target.value }))} /></label>
              ))}
            </div>
          </div>
        </section>
        {message ? <Notice text={message} error={!message.includes("confirmed")} /> : null}
        <button className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <ChevronRight size={17} />}
          Confirm region and extract
        </button>
      </form>
    </div>
  );
}

function Calibration({ cadFile, analysis, scene }: { cadFile: CadFile; analysis: Analysis; scene: Scene | null }) {
  const router = useRouter();
  const bounds = boundsValue(scene?.bounds, analysis);
  const imageRect = imageRectValue(analysis.inspection);
  const [points, setPoints] = useState<Array<[number, number]>>([]);
  const [drawingDistance, setDrawingDistance] = useState("");
  const [knownLengthFeet, setKnownLengthFeet] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const mapPoints = useCallback((next: Array<[number, number]>) => {
    setPoints(next);
    if (next.length === 2) setDrawingDistance(String(Number(Math.hypot(next[1][0] - next[0][0], next[1][1] - next[0][1]).toFixed(4))));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/calibration`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ drawingDistance: Number(drawingDistance), knownLengthFeet: Number(knownLengthFeet), source: "MANUAL" }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    setMessage(response.ok ? "Scale confirmed. Candidate review is ready." : body?.error ?? "Calibration failed.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Step 2 of 3</div><h2 className="mt-1 font-semibold">Confirm drawing scale</h2></div>
          <span className="text-sm text-slate-500">Click two ends of a known dimension</span>
        </div>
        {cadFile.format === "DXF" || cadFile.format === "DWG" ? (
          <MlightCadMap
            cadFileId={cadFile.id}
            fileName={cadFile.originalName}
            autoExtract={false}
            hiddenLayerNames={new Set()}
            onCalibrationPoints={mapPoints}
          />
        ) : (
          <CadMap
            cadFileId={cadFile.id}
            entities={scene?.entities ?? []}
            bounds={bounds}
            imageRect={imageRect}
            showPreview={Boolean(analysis.previewArtifactKey)}
            hiddenLayerIds={new Set()}
            onCalibrationPoints={mapPoints}
          />
        )}
      </section>
      <form onSubmit={submit} className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-2"><Ruler size={18} /><h2 className="font-semibold">Known measurement</h2></div>
        <p className="mt-2 text-sm leading-6 text-slate-600">Choose a clearly printed road width or plot side, then enter its real length in feet.</p>
        <label className="mt-4 block"><span className="label">Drawing distance</span><input className="input" type="number" step="any" min="0.0001" value={drawingDistance} onChange={(event) => setDrawingDistance(event.target.value)} required /></label>
        <label className="mt-4 block"><span className="label">Real length (feet)</span><input className="input" type="number" step="any" min="0.01" value={knownLengthFeet} onChange={(event) => setKnownLengthFeet(event.target.value)} placeholder="Example: 40" required /></label>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {points.length === 2 ? `Selected points: ${points[0].map((value) => value.toFixed(1)).join(", ")} to ${points[1].map((value) => value.toFixed(1)).join(", ")}` : "Select two points on the drawing, or enter the drawing distance manually."}
        </div>
        {message ? <Notice text={message} error={!message.includes("confirmed")} /> : null}
        <button className="btn-primary mt-4 w-full justify-center" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
          Confirm scale
        </button>
      </form>
    </div>
  );
}

function CandidateReview({ cadFile, analysis, scene, issues, versions }: { cadFile: CadFile; analysis: Analysis; scene: Scene | null; issues: Issue[]; versions: Version[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(scene?.entities.find((entity) => entity.status !== "REJECTED")?.id ?? "");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [leftTab, setLeftTab] = useState<"REVIEW" | "LAYERS">("REVIEW");
  const [leftOpen, setLeftOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [checksOpen, setChecksOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "NEEDS_REVIEW" | "BLOCKING" | "CONFIRMED" | "REJECTED" | "PLOT" | "SITE_ASSET" | "ELECTRICAL">("ALL");
  const [query, setQuery] = useState("");
  const [draftGeometry, setDraftGeometry] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [editBoundary, setEditBoundary] = useState(false);
  const entities = scene?.entities ?? [];
  const selected = entities.find((entity) => entity.id === selectedId) ?? null;
  const selectedMeasurements = objectValue(selected?.measurements ?? null);
  const bounds = boundsValue(scene?.bounds, analysis);
  const imageRect = imageRectValue(analysis.inspection);
  const unresolvedBlocking = issues.filter((issue) => issue.blocking);
  const duplicateBlocking = unresolvedBlocking.filter((issue) => issue.code === "DUPLICATE_PLOT_LABEL" && entities.find((entity) => entity.id === issue.entityId)?.status === "CONFIRMED");
  const nonCountBlocking = unresolvedBlocking.filter((issue) => issue.code !== "PLOT_COUNT_MISMATCH" && (!issue.entityId || entities.find((entity) => entity.id === issue.entityId)?.status === "CONFIRMED"));
  const confirmedCount = entities.filter((entity) => entity.status === "CONFIRMED").length;
  const pendingReviewCount = entities.filter((entity) => entity.status === "SUGGESTED").length;
  const confirmedPlotCount = entities.filter((entity) => entity.type === "PLOT" && entity.status === "CONFIRMED").length;
  const expectedPlotCountValue = objectValue(analysis.expectedCounts).total;
  const expectedPlotCount = typeof expectedPlotCountValue === "number" ? expectedPlotCountValue : undefined;
  const countMismatch = unresolvedBlocking.some((issue) => issue.code === "PLOT_COUNT_MISMATCH")
    || (expectedPlotCount !== undefined && confirmedPlotCount > 0 && confirmedPlotCount !== expectedPlotCount);
  const visible = useMemo(() => entities.filter((entity) => {
    if (query && !`${entity.label ?? ""} ${entity.type} ${entity.sourceLayer ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "NEEDS_REVIEW") return entity.status === "SUGGESTED";
    if (filter === "BLOCKING") return issues.some((issue) => issue.entityId === entity.id && issue.blocking);
    if (filter === "CONFIRMED") return entity.status === "CONFIRMED";
    if (filter === "REJECTED") return entity.status === "REJECTED";
    if (filter === "PLOT") return entity.type === "PLOT";
    if (filter === "SITE_ASSET") return !["PLOT", "UTILITY", "ELECTRICAL_POINT"].includes(entity.type);
    if (filter === "ELECTRICAL") return entity.type === "UTILITY" || entity.type === "ELECTRICAL_POINT";
    return true;
  }), [entities, filter, issues, query]);

  const selectEntity = useCallback((id: string) => {
    setSelectedId(id);
    setDraftGeometry(null);
  }, []);
  const geometryChanged = useCallback((id: string, geometry: Record<string, unknown>) => {
    if (id === selectedId) setDraftGeometry(geometry);
  }, [selectedId]);

  async function saveSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entities: [{
          entityId: selected.id,
          label: form.get("label"),
          type: form.get("type"),
          status: form.get("status"),
          geometry: draftGeometry ?? selected.geometry,
        }],
        resolvedIssueIds: issues.filter((issue) => issue.entityId === selected.id).map((issue) => issue.id),
      }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    setMessage(response.ok ? "Candidate saved." : body?.error ?? "Candidate update failed.");
    if (response.ok) router.refresh();
  }

  async function batch(status: "CONFIRMED" | "REJECTED" | "SUGGESTED") {
    if (!checkedIds.size) return;
    await batchIds([...checkedIds], status);
  }

  async function batchIds(ids: string[], status: "CONFIRMED" | "REJECTED" | "SUGGESTED") {
    if (!ids.length) return;
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/review/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entityIds: ids,
        status,
        resolvedIssueIds: status === "CONFIRMED" ? [] : issues.filter((issue) => issue.entityId && ids.includes(issue.entityId)).map((issue) => issue.id),
      }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    setMessage(response.ok ? `${ids.length} candidates marked ${status.toLowerCase()}.` : body?.error ?? "Batch review failed.");
    if (response.ok) {
      setCheckedIds(new Set());
      router.refresh();
    }
  }

  async function confirmAllPending() {
    const ids = entities.filter((entity) => entity.status === "SUGGESTED").map((entity) => entity.id);
    if (!ids.length) return;
    if (!window.confirm(`Confirm all ${ids.length} pending candidates as reviewed? You can still correct or reject them before publishing.`)) return;
    await batchIds(ids, "CONFIRMED");
  }

  async function confirmAllValidPlots() {
    const blockingIds = new Set(issues.filter((issue) => issue.blocking && issue.entityId).map((issue) => issue.entityId));
    const ids = entities
      .filter((entity) => entity.type === "PLOT" && entity.status === "SUGGESTED" && !blockingIds.has(entity.id))
      .map((entity) => entity.id);
    if (!ids.length) return;
    if (!window.confirm(`Approve all ${ids.length} valid plots? Only closed, uniquely labelled plots without blocking issues will be confirmed.`)) return;
    await batchIds(ids, "CONFIRMED");
  }

  async function resolveDuplicates() {
    if (!duplicateBlocking.length) return;
    if (!window.confirm("Resolve duplicate plot detections automatically? The strongest candidate for each repeated plot number will remain confirmed, and duplicate copies will move to Rejected. You can restore them later.")) return;
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/review/resolve-duplicates`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Duplicate resolution failed.");
      return;
    }
    setMessage(`${body.data.resolvedGroups} duplicate plot numbers resolved. ${body.data.rejectedDuplicateCount} duplicate copies moved to Rejected.`);
    setFilter("ALL");
    router.refresh();
  }

  async function decideSelected(status: "CONFIRMED" | "REJECTED") {
    if (!selected) return;
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entities: [{
          entityId: selected.id,
          label: selected.label,
          type: selected.type,
          status,
          geometry: draftGeometry ?? selected.geometry,
        }],
        resolvedIssueIds: status === "REJECTED"
          ? issues.filter((issue) => issue.entityId === selected.id).map((issue) => issue.id)
          : [],
      }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Candidate update failed.");
      return;
    }
    const currentIndex = visible.findIndex((entity) => entity.id === selected.id);
    const next = [...visible.slice(currentIndex + 1), ...visible.slice(0, currentIndex)]
      .find((entity) => entity.status === "SUGGESTED" && entity.id !== selected.id);
    if (next) selectEntity(next.id);
    setMessage(`${selected.label ?? "Candidate"} marked ${status.toLowerCase()}.`);
    router.refresh();
  }

  async function publish() {
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ overrideReason: countMismatch ? overrideReason : undefined }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Publish failed.");
      return;
    }
    setMessage(`Published ${body.data.plots.length} plots and ${body.data.assets.length} site assets.`);
    if (cadFile.projectId) {
      router.push(`/app/projects/${cadFile.projectId}/ownership?source=cad`);
      return;
    }
    router.refresh();
  }

  async function rollback() {
    setLoading(true);
    const previewResponse = await fetch(`/api/v1/cad/${cadFile.id}/publish/rollback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: false }),
    });
    const previewBody = await previewResponse.json().catch(() => null);
    if (!previewResponse.ok) {
      setLoading(false);
      setMessage(previewBody?.error ?? "Rollback preview failed.");
      return;
    }
    const preview = previewBody.data.preview;
    const safeCount = preview.safePlots.length + preview.safeAssets.length + preview.safeChecklistItems.length;
    const protectedCount = preview.protectedPlots.length + preview.protectedAssets.length + preview.protectedChecklistItems.length;
    const reason = window.prompt(
      `${safeCount} untouched Map-created records can be removed from active use. ${protectedCount} records are protected because they contain business activity.\n\nEnter the rollback reason to continue:`,
    );
    if (!reason) {
      setLoading(false);
      return;
    }
    const response = await fetch(`/api/v1/cad/${cadFile.id}/publish/rollback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true, reason }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    setMessage(response.ok
      ? body.data.result.partial
        ? "Untouched Map-created records were removed. Records with business activity remain protected."
        : "Untouched Map-created records were removed and the drawing was scheduled for safe reinspection."
      : body?.error ?? "Rollback failed.");
    if (response.ok) router.refresh();
  }

  const desktopColumns = leftOpen && inspectorOpen
    ? "xl:grid-cols-[300px_minmax(0,1fr)_340px]"
    : leftOpen
      ? "xl:grid-cols-[300px_minmax(0,1fr)]"
      : inspectorOpen
        ? "xl:grid-cols-[minmax(0,1fr)_340px]"
        : "xl:grid-cols-1";
  const validPendingPlotCount = entities.filter((entity) => (
    entity.type === "PLOT"
    && entity.status === "SUGGESTED"
    && !issues.some((issue) => issue.entityId === entity.id && issue.blocking)
  )).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{cadFile.status === "PUBLISHED" ? "Published spatial records" : "Candidate review"}</h2>
              <span className="chip bg-slate-100 text-slate-700">{cadFile.status.replaceAll("_", " ")}</span>
              <button className="chip bg-amber-50 text-amber-800" onClick={() => setChecksOpen(true)}>{unresolvedBlocking.length} blocking</button>
              <span className="chip bg-emerald-50 text-emerald-800">{confirmedCount} confirmed</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cadFile.status !== "PUBLISHED" && validPendingPlotCount > 0 ? (
              <button className="btn-primary h-9" onClick={confirmAllValidPlots} disabled={loading}>
                <Check size={16} />
                <span className="hidden sm:inline">Approve {validPendingPlotCount} valid plots</span>
              </button>
            ) : null}
            <button className={`btn-ghost h-9 w-9 px-0 ${leftOpen ? "bg-slate-100" : ""}`} onClick={() => setLeftOpen((value) => !value)} title="Toggle review panel"><FileSearch size={16} /></button>
            <button className={`btn-ghost h-9 w-9 px-0 ${inspectorOpen ? "bg-slate-100" : ""}`} onClick={() => setInspectorOpen((value) => !value)} title="Toggle candidate inspector"><Settings2 size={16} /></button>
            {cadFile.status === "PUBLISHED" ? (
              <button className="btn-outline h-9 text-rose-700" onClick={rollback} disabled={loading}><Trash2 size={16} /> <span className="hidden sm:inline">Roll back publish</span></button>
            ) : (
              <button
                className="btn-gold h-9"
                onClick={publish}
                disabled={loading || confirmedCount === 0 || nonCountBlocking.length > 0 || (countMismatch && overrideReason.trim().length < 10)}
                title={confirmedCount === 0 ? "Confirm reviewed candidates before publishing" : nonCountBlocking.length ? "Resolve blocking issues before publishing" : countMismatch && overrideReason.trim().length < 10 ? "Enter a plot-count override reason" : "Publish confirmed candidates"}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                <span className="hidden sm:inline">Publish to project</span>
              </button>
            )}
          </div>
        </div>
        {countMismatch && cadFile.status !== "PUBLISHED" ? (
          <label className="mt-3 block max-w-3xl">
            <span className="label">Plot-count override reason</span>
            <input className="input" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Explain why the confirmed plot count intentionally differs from the drawing schedule." />
          </label>
        ) : null}
        {cadFile.status !== "PUBLISHED" && confirmedCount === 0 && pendingReviewCount > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>The drawing is extracted, but its {pendingReviewCount} candidates are still marked “Needs review”. Confirm them before publishing.</span>
            <button className="btn-primary h-8 px-3 text-xs" onClick={confirmAllPending} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              Confirm all pending
            </button>
          </div>
        ) : null}
        {cadFile.status !== "PUBLISHED" && duplicateBlocking.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>{duplicateBlocking.length} blocking entries come from repeated plot numbers. Keep one copy of each number before publishing.</span>
            <button className="btn-primary h-8 px-3 text-xs" onClick={resolveDuplicates} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              Resolve duplicate detections
            </button>
          </div>
        ) : null}
        {cadFile.status !== "PUBLISHED" && confirmedCount > 0 && pendingReviewCount === 0 && nonCountBlocking.length === 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span>Review is complete. Publish now to create or link plots in Ownership and site components in Development.</span>
            <button className="btn-primary h-8 px-3 text-xs" onClick={publish} disabled={loading || (countMismatch && overrideReason.trim().length < 10)}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Publish and open Ownership
            </button>
          </div>
        ) : null}
        {message ? <Notice text={message} error={message.includes("failed") || message.includes("Resolve")} /> : null}
      </header>

      <div className={`relative grid min-h-0 flex-1 grid-cols-1 ${desktopColumns}`}>
        {leftOpen ? <aside className="absolute inset-y-0 left-0 z-30 flex w-[min(88vw,320px)] min-h-0 flex-col border-r border-slate-200 bg-slate-50 shadow-xl xl:static xl:w-auto xl:shadow-none">
          <div className="flex h-11 shrink-0 border-b border-slate-200 bg-white p-1">
            <button className={`flex-1 rounded text-xs font-medium ${leftTab === "REVIEW" ? "bg-navy-900 text-white" : "text-slate-600"}`} onClick={() => setLeftTab("REVIEW")}>Review queue <span className="opacity-70">{visible.length}</span></button>
            <button className={`flex-1 rounded text-xs font-medium ${leftTab === "LAYERS" ? "bg-navy-900 text-white" : "text-slate-600"}`} onClick={() => setLeftTab("LAYERS")}>Layers <span className="opacity-70">{scene?.layers.length ?? 0}</span></button>
            <button className="btn-ghost h-9 w-9 px-0 xl:hidden" onClick={() => setLeftOpen(false)}><ChevronLeft size={16} /></button>
          </div>
          {leftTab === "LAYERS" ? (
            <section className="flex min-h-0 flex-1 flex-col p-3">
              <div className="flex shrink-0 items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Layers3 size={15} /> Drawing layers</h3>
                <div className="flex items-center gap-2 text-xs">
                <button type="button" className="text-navy-800 hover:underline" onClick={() => setHiddenLayers(new Set())}>Show all</button>
                <span className="text-slate-300">|</span>
                <button type="button" className="text-slate-600 hover:underline" onClick={() => setHiddenLayers(new Set((scene?.layers ?? []).map((layer) => layer.id)))}>Hide all</button>
              </div>
              </div>
              <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                {scene?.layers.map((layer) => {
                  const hidden = hiddenLayers.has(layer.id);
                  return (
                    <button key={layer.id} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${hidden ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-white"}`} onClick={() => setHiddenLayers((current) => toggleSet(current, layer.id))}>
                      <span className="min-w-0"><span className="block truncate">{layer.name}</span><span className="block truncate text-xs text-slate-500">{layer.purpose ?? "Unclassified"}</span></span>
                      <Eye size={15} />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white p-3">
                <input className="input h-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plot, layer, type or handle" />
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {(["ALL", "NEEDS_REVIEW", "BLOCKING", "CONFIRMED", "REJECTED", "PLOT", "SITE_ASSET", "ELECTRICAL"] as const).map((item) => (
                    <button key={item} className={`shrink-0 rounded border px-2 py-1.5 text-[11px] font-medium ${filter === item ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setFilter(item)}>{item.replaceAll("_", " ")}</button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">{checkedIds.size} selected</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-navy-800 hover:underline" onClick={() => setCheckedIds(new Set(visible.map((entity) => entity.id)))}>Select visible</button>
                    {checkedIds.size ? <button type="button" className="text-slate-600 hover:underline" onClick={() => setCheckedIds(new Set())}>Clear</button> : null}
                  </div>
                </div>
              </div>
              <CandidateQueue
                entities={visible}
                selectedId={selectedId}
                checkedIds={checkedIds}
                onSelect={selectEntity}
                onToggle={(entityId) => setCheckedIds((current) => toggleSet(current, entityId))}
              />
              {checkedIds.size ? (
                <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3">
                  <button className="btn-primary h-9 px-2 text-xs" onClick={() => batch("CONFIRMED")} disabled={loading}><Check size={14} /> Confirm</button>
                  <button className="btn-outline h-9 px-2 text-xs" onClick={() => batch("REJECTED")} disabled={loading}><X size={14} /> Reject</button>
                </div>
              ) : null}
            </section>
          )}
        </aside> : null}

        <section className="relative min-h-0 overflow-hidden bg-slate-100">
          <CadMap
            cadFileId={cadFile.id}
            entities={entities}
            bounds={bounds}
            imageRect={imageRect}
            showPreview={Boolean(analysis.previewArtifactKey)}
            hiddenLayerIds={hiddenLayers}
            selectedId={selectedId}
            onSelect={selectEntity}
            editable={cadFile.status !== "PUBLISHED" && Boolean(selected) && editBoundary}
            onGeometryChange={geometryChanged}
          />
          {cadFile.status !== "PUBLISHED" && selected ? (
            <button
              type="button"
              className="btn-outline absolute bottom-3 right-3 z-20 bg-white shadow"
              onClick={() => setEditBoundary((value) => !value)}
            >
              {editBoundary ? "Finish boundary adjustment" : "Adjust selected boundary"}
            </button>
          ) : null}
        </section>

        {inspectorOpen ? <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(92vw,360px)] min-h-0 flex-col border-l border-slate-200 bg-white shadow-xl xl:static xl:w-auto xl:shadow-none">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Candidate inspector</span>
            <button className="btn-ghost h-8 w-8 px-0" onClick={() => setInspectorOpen(false)} title="Close inspector"><ChevronRight size={16} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selected ? (
            <form id={`candidate-form-${selected.id}`} key={selected.id} onSubmit={saveSelected} className="space-y-4">
              <div><h2 className="text-lg font-semibold">{selected.label ?? selected.type}</h2><div className="mt-1 text-xs text-slate-500">{selected.sourceHandle ? `CAD handle ${selected.sourceHandle}` : "Reconstructed business boundary"}</div></div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <Metric label="Confidence" value={`${Math.round(Number(selected.confidence) * 100)}%`} />
                <Metric label="Layer" value={selected.sourceLayer ?? "-"} />
                <Metric label="Status" value={selected.status} />
                <Metric label="Issues" value={String(issues.filter((issue) => issue.entityId === selected.id).length)} />
                {selected.type === "PLOT" ? <Metric label="Geometry area" value={formatArea(selectedMeasurements.calculatedAreaSqft ?? selectedMeasurements.areaSqft)} /> : null}
                {selected.type === "PLOT" ? <Metric label="Printed area" value={formatArea(selectedMeasurements.printedAreaSqft)} /> : null}
              </div>
              <label className="block"><span className="label">Label / plot number</span><input className="input" name="label" defaultValue={selected.label ?? ""} /></label>
              <label className="block"><span className="label">Business type</span><select className="input" name="type" defaultValue={selected.type}>{Object.values(CadEntityType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
              <label className="block"><span className="label">Review decision</span><select className="input" name="status" defaultValue={selected.status}><option value="SUGGESTED">Needs review</option><option value="CONFIRMED">Confirmed</option><option value="REJECTED">Rejected</option></select></label>
              {issues.filter((issue) => issue.entityId === selected.id).map((issue) => (
                <div key={issue.id} className={`rounded-md border p-3 text-sm ${issue.blocking ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                  <div className="font-medium">{issue.code.replaceAll("_", " ")}</div><div className="mt-1 text-xs">{issue.message}</div>
                </div>
              ))}
              {draftGeometry ? <Notice text="Boundary edited on the map. Save this candidate to keep the change." /> : null}
              {selected.spatialLinks[0] && cadFile.projectId ? <BusinessLink projectId={cadFile.projectId} link={selected.spatialLinks[0]} /> : null}
            </form>
          ) : <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Select a candidate on the map or in the review queue.</div>}
          </div>
          {selected && cadFile.status !== "PUBLISHED" ? (
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3">
              <button className="btn-outline h-9 px-2 text-xs text-rose-700" onClick={() => decideSelected("REJECTED")} disabled={loading}><X size={14} /> Reject & next</button>
              <button className="btn-primary h-9 px-2 text-xs" onClick={() => decideSelected("CONFIRMED")} disabled={loading}><Check size={14} /> Confirm & next</button>
              <button className="btn-outline col-span-2 h-9 text-xs" type="submit" form={`candidate-form-${selected.id}`} disabled={loading}><Save size={14} /> Save candidate details</button>
            </div>
          ) : null}
        </aside> : null}
      </div>
      {checksOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={() => setChecksOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Publish checks</h2><button className="btn-ghost h-9 w-9 px-0" onClick={() => setChecksOpen(false)}><X size={17} /></button></div>
            <div className="mt-5 space-y-2">
              {issues.filter((issue) => !issue.entityId).map((issue) => <div key={issue.id} className={`rounded-md p-3 text-sm ${issue.blocking ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>{issue.message}</div>)}
              {expectedPlotCount !== undefined && confirmedPlotCount !== expectedPlotCount ? <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{confirmedPlotCount} of {expectedPlotCount} scheduled plots are confirmed.</div> : null}
              {!issues.filter((issue) => !issue.entityId).length && !countMismatch ? <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">No drawing-level validation issues.</div> : null}
            </div>
            {versions.length ? <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">Published versions: {versions.map((version) => `v${version.version}`).join(", ")}</div> : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function CandidateQueue({
  entities,
  selectedId,
  checkedIds,
  onSelect,
  onToggle,
}: {
  entities: Entity[];
  selectedId: string | null;
  checkedIds: Set<string>;
  onSelect: (entityId: string) => void;
  onToggle: (entityId: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const rowHeight = 62;
  const overscan = 8;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setViewportHeight(viewport.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !selectedId) return;
    const selectedIndex = entities.findIndex((entity) => entity.id === selectedId);
    if (selectedIndex < 0) return;
    const rowTop = selectedIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    if (rowTop < viewport.scrollTop) viewport.scrollTo({ top: rowTop, behavior: "smooth" });
    else if (rowBottom > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTo({ top: rowBottom - viewport.clientHeight, behavior: "smooth" });
    }
  }, [entities, selectedId]);

  if (!entities.length) {
    return <div className="min-h-0 flex-1 p-6 text-center text-sm text-slate-500">No candidates match this filter.</div>;
  }

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(entities.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  const rendered = entities.slice(start, end);

  return (
    <div
      ref={viewportRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: entities.length * rowHeight }}>
        <div className="absolute inset-x-0 top-0 space-y-1" style={{ transform: `translateY(${start * rowHeight}px)` }}>
          {rendered.map((entity) => (
            <label
              key={entity.id}
              className={`flex h-[58px] cursor-pointer items-start gap-2 rounded-md border p-2 ${selectedId === entity.id ? "border-gold-400 bg-gold-50" : "border-transparent hover:bg-white"}`}
            >
              <input className="mt-1" type="checkbox" checked={checkedIds.has(entity.id)} onChange={() => onToggle(entity.id)} />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(entity.id)}>
                <span className="block truncate text-sm font-medium">{entity.label ?? "Unlabelled"}</span>
                <span className="block truncate text-xs text-slate-500">{entity.type.replaceAll("_", " ")} · {Math.round(Number(entity.confidence) * 100)}% · {entity.status}</span>
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function BusinessLink({ projectId, link }: { projectId: string; link: Entity["spatialLinks"][number] }) {
  const href = link.recordType === "Plot"
    ? `/app/projects/${projectId}/plots/${link.recordId}`
    : link.recordType === "SiteAsset"
      ? `/app/projects/${projectId}/development`
      : `/app/projects/${projectId}`;
  return <Link className="btn-outline w-full justify-center" href={href}><MapPinned size={16} /> Open {link.recordType.toLowerCase()} workspace</Link>;
}

function StatePanel({ icon, title, detail, children }: { icon: React.ReactNode; title: string; detail: string; children?: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-card"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">{icon}</div><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{detail}</p><div className="mt-6">{children}</div></div>;
}

function ProcessingSteps({ status }: { status: string }) {
  const steps = ["UPLOADED", "PARSING", "ANALYZING", "SETUP_REQUIRED", "EXTRACTING", "CALIBRATION_REQUIRED", "REVIEW_REQUIRED"];
  const rank = steps.indexOf(status);
  return <div className="mx-auto mt-6 grid max-w-4xl gap-2 text-left text-xs md:grid-cols-6">{steps.map((step, index) => <div key={step} className={`rounded-md border px-3 py-2 ${index <= rank ? "border-gold-300 bg-gold-50 text-navy-950" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{step.replaceAll("_", " ")}</div>)}</div>;
}

function RegionInput({ label, value, allowZero = false, onChange }: { label: string; value: number; allowZero?: boolean; onChange: (value: number) => void }) {
  const minimum = allowZero ? 0 : 0.01;
  return <label><span className="label">{label} (%)</span><input className="input" type="number" min={allowZero ? "0" : "1"} max="100" step="1" value={Math.round(value * 100)} onChange={(event) => onChange(Math.max(minimum, Number(event.target.value) / 100))} /></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 truncate font-medium text-slate-900">{value}</dd></div>;
}

function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`mt-3 rounded-md px-3 py-2 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{text}</div>;
}

function statusTitle(status: string) {
  if (status === "UPLOADED") return "Map file stored";
  if (status === "CONVERTING") return "Converting drawing";
  if (status === "PARSING" || status === "ANALYZING") return "Inspecting drawing structure";
  if (status === "EXTRACTING") return "Extracting safe business candidates";
  return "Preparing Map intelligence";
}

function statusHelp(status: string) {
  if (status === "UPLOADED") return "The file is safely stored. AI analysis will begin shortly.";
  if (status === "ANALYZING") return "AI is analyzing the drawing structure, detecting plot regions, schedules, and boundaries.";
  if (status === "EXTRACTING") return "AI is extracting plot boundaries, labels, roads, and site assets from the confirmed region.";
  return "This page refreshes automatically when the next review step is ready.";
}

function regionValue(value: Json): Region | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const region = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every((key) => typeof region[key] === "number")
    ? { x: region.x as number, y: region.y as number, width: region.width as number, height: region.height as number }
    : null;
}

function objectValue(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstPageValue(inspection: Record<string, unknown>, key: string) {
  const pages = inspection.pages;
  if (!Array.isArray(pages) || !pages[0] || typeof pages[0] !== "object") return undefined;
  return (pages[0] as Record<string, unknown>)[key];
}

function imageRectValue(inspectionValue: Json) {
  const inspection = objectValue(inspectionValue);
  const previewImage = objectValue(inspection.previewImage as Json);
  const recognitionImage = objectValue(inspection.recognitionImage as Json);
  const largestImage = objectValue(inspection.largestImage as Json);
  const rect = previewImage.rect ?? recognitionImage.rect ?? largestImage.rect;
  return Array.isArray(rect) ? rect.filter((value): value is number => typeof value === "number") : null;
}

function boundsValue(value: Json | undefined, analysis: Analysis) {
  const bounds = objectValue(value ?? null);
  if (["minX", "minY", "maxX", "maxY"].every((key) => typeof bounds[key] === "number")) {
    return { minX: bounds.minX as number, minY: bounds.minY as number, maxX: bounds.maxX as number, maxY: bounds.maxY as number };
  }
  const inspection = objectValue(analysis.inspection);
  const pageBounds = inspection.pageBounds;
  if (Array.isArray(pageBounds) && pageBounds.length === 4 && pageBounds.every((item) => typeof item === "number")) {
    return { minX: pageBounds[0], minY: pageBounds[1], maxX: pageBounds[2], maxY: pageBounds[3] };
  }
  return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
}

function toggleSet(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function formatArea(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)} sq ft` : "Not available";
}

function formatElapsed(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}
