"use client";

import { CadEntityType } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ChevronDown,
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
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
      <BrowserExtractionWorkspace
        cadFile={cadFile}
        onComplete={() => {
          router.refresh();
        }}
      />
    );
  }

  if (status === "FAILED") {
    return (
      <StatePanel icon={<AlertTriangle size={24} />} title="Map processing stopped" detail={errorMessage ?? "Map processing could not inspect this drawing."}>
        <button className="btn-primary" onClick={retry} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCcw size={17} />}
          Retry safely
        </button>
      </StatePanel>
    );
  }

  if (!analysis || !["SETUP_REQUIRED", "CALIBRATION_REQUIRED", "REVIEW_REQUIRED", "PUBLISHED"].includes(status)) {
    return (
      <StatePanel icon={<Loader2 className="animate-spin" size={24} />} title={progressLabel ?? statusTitle(status)} detail={statusHelp(status)}>
        <div className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-md bg-slate-50 px-4 py-2 text-xs text-slate-600">
          <span>{processingStage?.replaceAll("_", " ") ?? status.replaceAll("_", " ")}</span>
          <span className="h-3 w-px bg-slate-300" />
          <span>{formatElapsed(elapsedMs)}</span>
        </div>
        <ProcessingSteps status={status} />
        {message ? <Notice text={message} /> : null}
      </StatePanel>
    );
  }

  if (status === "SETUP_REQUIRED") {
    return <DrawingSetup cadFile={cadFile} analysis={analysis} />;
  }

  if (status === "CALIBRATION_REQUIRED") {
    return <Calibration cadFile={cadFile} analysis={analysis} scene={scene} />;
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

function BrowserExtractionWorkspace({ cadFile, onComplete }: { cadFile: CadFile; onComplete: () => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Browser CAD processing</div>
          <h2 className="mt-1 font-semibold">Opening {cadFile.originalName}</h2>
          <p className="mt-1 text-xs text-slate-500">DXF/DWG rendering and extraction run locally in this browser. Publishing still requires server validation and admin review.</p>
        </div>
        <span className="chip bg-emerald-50 text-emerald-800">No CAD worker required</span>
      </header>
      <div className="h-[calc(100dvh-18rem)] min-h-[620px]">
        <MlightCadMap
          cadFileId={cadFile.id}
          fileName={cadFile.originalName}
          autoExtract
          hiddenLayerNames={new Set()}
          onExtractionComplete={onComplete}
        />
      </div>
    </section>
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
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [reviewExpanded, setReviewExpanded] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PLOT" | "ELECTRICAL" | "ISSUES">("ALL");
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
  const nonCountBlocking = unresolvedBlocking.filter((issue) => issue.code !== "PLOT_COUNT_MISMATCH" && (!issue.entityId || entities.find((entity) => entity.id === issue.entityId)?.status === "CONFIRMED"));
  const confirmedCount = entities.filter((entity) => entity.status === "CONFIRMED").length;
  const confirmedPlotCount = entities.filter((entity) => entity.type === "PLOT" && entity.status === "CONFIRMED").length;
  const expectedPlotCountValue = objectValue(analysis.expectedCounts).total;
  const expectedPlotCount = typeof expectedPlotCountValue === "number" ? expectedPlotCountValue : undefined;
  const countMismatch = unresolvedBlocking.some((issue) => issue.code === "PLOT_COUNT_MISMATCH")
    || (expectedPlotCount !== undefined && confirmedPlotCount > 0 && confirmedPlotCount !== expectedPlotCount);
  const visible = useMemo(() => entities.filter((entity) => {
    if (query && !`${entity.label ?? ""} ${entity.type} ${entity.sourceLayer ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "PLOT") return entity.type === "PLOT";
    if (filter === "ELECTRICAL") return entity.type === "UTILITY" || entity.type === "ELECTRICAL_POINT";
    if (filter === "ISSUES") return issues.some((issue) => issue.entityId === entity.id);
    return true;
  }), [entities, filter, issues, query]);

  const selectEntity = useCallback((id: string) => {
    setSelectedId(id);
    setDraftGeometry(null);
  }, []);
  const selectSourceHandle = useCallback((sourceHandle: string) => {
    const entity = entities.find((value) => value.sourceHandle === sourceHandle);
    if (entity) selectEntity(entity.id);
  }, [entities, selectEntity]);
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
    setLoading(true);
    const ids = [...checkedIds];
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

  async function publish() {
    setLoading(true);
    const response = await fetch(`/api/v1/cad/${cadFile.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ overrideReason: countMismatch ? overrideReason : undefined }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    setMessage(response.ok ? `Published ${body.data.plots.length} plots and ${body.data.assets.length} site assets.` : body?.error ?? "Publish failed.");
    if (response.ok) router.refresh();
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

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card xl:flex xl:h-[calc(100dvh-13rem)] xl:min-h-[560px] xl:flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{cadFile.status === "PUBLISHED" ? "Published spatial records" : "Step 3 of 3 · Candidate review"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{cadFile.originalName}</h2>
              <span className="chip bg-slate-100 text-slate-700">{cadFile.status.replaceAll("_", " ")}</span>
              <span className="chip bg-amber-50 text-amber-800">{unresolvedBlocking.length} blocking</span>
              <span className="chip bg-emerald-50 text-emerald-800">{confirmedCount} confirmed</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cadFile.status === "PUBLISHED" ? (
              <button className="btn-outline text-rose-700" onClick={rollback} disabled={loading}><Trash2 size={16} /> Roll back Map publish</button>
            ) : (
              <button className="btn-gold" onClick={publish} disabled={loading || confirmedCount === 0 || nonCountBlocking.length > 0 || (countMismatch && overrideReason.trim().length < 10)}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Publish reviewed records
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
        {message ? <Notice text={message} error={message.includes("failed") || message.includes("Resolve")} /> : null}
      </header>

      <div className="grid min-h-[720px] xl:min-h-0 xl:flex-1 xl:grid-cols-[280px_minmax(0,1fr)_350px]">
        <aside className="border-r border-slate-200 bg-slate-50 p-4 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
          <label className="block"><span className="label">Search candidates</span><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plot number, layer, type" /></label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["ALL", "PLOT", "ELECTRICAL", "ISSUES"] as const).map((item) => (
              <button key={item} className={`rounded-md border px-2 py-2 text-xs font-medium ${filter === item ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-600"}`} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <section className="mt-4 shrink-0 border-t border-slate-200 pt-3">
            <button type="button" className="flex w-full items-center justify-between text-left xl:pointer-events-none" onClick={() => setLayersExpanded((current) => !current)}>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Layers3 size={15} /> Layers <span className="font-normal text-slate-500">{scene?.layers.length ?? 0}</span></h3>
              <ChevronDown className={`transition-transform xl:hidden ${layersExpanded ? "rotate-180" : ""}`} size={16} />
            </button>
            <div className={`${layersExpanded ? "block" : "hidden"} xl:block`}>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <button type="button" className="text-navy-800 hover:underline" onClick={() => setHiddenLayers(new Set())}>Show all</button>
                <span className="text-slate-300">|</span>
                <button type="button" className="text-slate-600 hover:underline" onClick={() => setHiddenLayers(new Set((scene?.layers ?? []).map((layer) => layer.id)))}>Hide all</button>
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 xl:max-h-[24dvh]">
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
            </div>
          </section>
          <section className="mt-4 border-t border-slate-200 pt-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <button type="button" className="flex w-full items-center justify-between text-left xl:pointer-events-none" onClick={() => setReviewExpanded((current) => !current)}>
              <span className="text-sm font-semibold">Review queue <span className="font-normal text-slate-500">{visible.length}</span></span>
              <ChevronDown className={`transition-transform xl:hidden ${reviewExpanded ? "rotate-180" : ""}`} size={16} />
            </button>
            <div className={`${reviewExpanded ? "mt-2 flex" : "hidden"} max-h-[420px] min-h-0 flex-col xl:mt-2 xl:flex xl:max-h-none xl:flex-1`}>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {visible.map((entity) => (
                <label key={entity.id} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 ${selectedId === entity.id ? "border-gold-400 bg-gold-50" : "border-transparent hover:bg-white"}`}>
                  <input className="mt-1" type="checkbox" checked={checkedIds.has(entity.id)} onChange={() => setCheckedIds((current) => toggleSet(current, entity.id))} />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => selectEntity(entity.id)}>
                    <span className="block truncate text-sm font-medium">{entity.label ?? "Unlabelled"}</span>
                    <span className="text-xs text-slate-500">{entity.type.replaceAll("_", " ")} · {Math.round(Number(entity.confidence) * 100)}% · {entity.status}</span>
                  </button>
                </label>
              ))}
              </div>
              {checkedIds.size ? (
                <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
                  <button className="btn-primary h-9 px-2 text-xs" onClick={() => batch("CONFIRMED")} disabled={loading}><Check size={14} /> Confirm</button>
                  <button className="btn-outline h-9 px-2 text-xs" onClick={() => batch("REJECTED")} disabled={loading}><X size={14} /> Reject</button>
                </div>
              ) : null}
            </div>
          </section>
        </aside>

        <section className="relative min-h-[620px] overflow-hidden xl:min-h-0">
          {(cadFile.format === "DXF" || cadFile.format === "DWG") && !editBoundary ? (
            <MlightCadMap
              cadFileId={cadFile.id}
              fileName={cadFile.originalName}
              autoExtract={false}
              hiddenLayerNames={new Set((scene?.layers ?? []).filter((layer) => hiddenLayers.has(layer.id)).map((layer) => layer.name))}
              selectedSourceHandle={selected?.sourceHandle}
              onSelectSourceHandle={selectSourceHandle}
            />
          ) : (
            <CadMap
              cadFileId={cadFile.id}
              entities={entities}
              bounds={bounds}
              imageRect={imageRect}
              showPreview={Boolean(analysis.previewArtifactKey)}
              hiddenLayerIds={hiddenLayers}
              selectedId={selectedId}
              onSelect={selectEntity}
              editable={cadFile.status !== "PUBLISHED" && Boolean(selected)}
              onGeometryChange={geometryChanged}
            />
          )}
          {(cadFile.format === "DXF" || cadFile.format === "DWG") && cadFile.status !== "PUBLISHED" ? (
            <button
              type="button"
              className="btn-outline absolute bottom-3 right-3 z-20 bg-white shadow"
              onClick={() => setEditBoundary((value) => !value)}
            >
              {editBoundary ? "Return to CAD drawing" : "Adjust selected boundary"}
            </button>
          ) : null}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow">
            {editBoundary
              ? "Drag selected plot vertices to correct the reviewed boundary"
              : "Scroll to zoom at the cursor · Use Pan mode to move around the drawing"}
          </div>
        </section>

        <aside className="border-l border-slate-200 p-4 xl:min-h-0 xl:overflow-y-auto">
          {selected ? (
            <form key={selected.id} onSubmit={saveSelected} className="space-y-4">
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Selected candidate</div><h2 className="mt-1 text-lg font-semibold">{selected.label ?? selected.type}</h2></div>
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
              {cadFile.status !== "PUBLISHED" ? <button className="btn-primary w-full justify-center" disabled={loading}><Save size={16} /> Save candidate</button> : null}
              {selected.spatialLinks[0] && cadFile.projectId ? <BusinessLink projectId={cadFile.projectId} link={selected.spatialLinks[0]} /> : null}
            </form>
          ) : <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Select a candidate on the map or in the review queue.</div>}

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> Publish checks</h3>
            <div className="mt-2 space-y-2">
              {issues.filter((issue) => !issue.entityId).map((issue) => (
                <div key={issue.id} className={`rounded-md p-3 text-xs ${issue.blocking ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>{issue.message}</div>
              ))}
              {expectedPlotCount !== undefined && confirmedPlotCount !== expectedPlotCount ? (
                <div className="rounded-md bg-rose-50 p-3 text-xs text-rose-800">
                  {confirmedPlotCount} of {expectedPlotCount} scheduled plots are currently confirmed.
                </div>
              ) : null}
              {!issues.filter((issue) => !issue.entityId).length && !countMismatch ? <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">No drawing-level validation issues.</div> : null}
            </div>
          </div>
          {versions.length ? <div className="mt-5 text-xs text-slate-500">Published versions: {versions.map((version) => `v${version.version}`).join(", ")}</div> : null}
        </aside>
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
