"use client";

import { FormEvent, PointerEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Minus, Plus, Route, Wrench, ZoomIn } from "lucide-react";

type ManualPlotInput = {
  id?: string;
  code: string;
  areaSqYards?: string | null;
  primeLocation?: string | null;
  allottedBy?: string | null;
  dimensions?: string | null;
  boundaries?: Record<string, unknown> | null;
};

export function ManualPlotForm({
  projectId,
  cadFileId,
  plot,
  lastPlot,
}: {
  projectId: string;
  cadFileId?: string;
  plot?: ManualPlotInput;
  lastPlot?: ManualPlotInput;
}) {
  const router = useRouter();
  const [code, setCode] = useState(plot?.code ?? "");
  const [areaSqYards, setAreaSqYards] = useState(plot?.areaSqYards ?? "");
  const [primeLocation, setPrimeLocation] = useState(plot?.primeLocation ?? "");
  const [allottedBy, setAllottedBy] = useState(plot?.allottedBy ?? "");
  const [dimensions, setDimensions] = useState(plot?.dimensions ?? "");
  const [boundaries, setBoundaries] = useState({
    north: boundaryText(plot?.boundaries, "north"),
    northDimension: boundaryText(plot?.boundaries, "northDimension"),
    south: boundaryText(plot?.boundaries, "south"),
    southDimension: boundaryText(plot?.boundaries, "southDimension"),
    east: boundaryText(plot?.boundaries, "east"),
    eastDimension: boundaryText(plot?.boundaries, "eastDimension"),
    west: boundaryText(plot?.boundaries, "west"),
    westDimension: boundaryText(plot?.boundaries, "westDimension"),
  });
  const [zoom, setZoom] = useState(100);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const mapViewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  function copyFromLastPlot() {
    if (!lastPlot) return;
    setAreaSqYards(lastPlot.areaSqYards ?? "");
    setPrimeLocation(lastPlot.primeLocation ?? "");
    setAllottedBy(lastPlot.allottedBy ?? "");
    setDimensions(lastPlot.dimensions ?? "");
    setBoundaries({
      north: boundaryText(lastPlot.boundaries, "north"),
      northDimension: boundaryText(lastPlot.boundaries, "northDimension"),
      south: boundaryText(lastPlot.boundaries, "south"),
      southDimension: boundaryText(lastPlot.boundaries, "southDimension"),
      east: boundaryText(lastPlot.boundaries, "east"),
      eastDimension: boundaryText(lastPlot.boundaries, "eastDimension"),
      west: boundaryText(lastPlot.boundaries, "west"),
      westDimension: boundaryText(lastPlot.boundaries, "westDimension"),
    });
    setMessage(`Copied details from the last added plot${lastPlot.code ? ` (${lastPlot.code})` : ""}.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(plot?.id ? `/api/v1/plots/${plot.id}` : `/api/v1/projects/${projectId}/plots`, {
      method: plot?.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        areaSqYards: areaSqYards ? Number(areaSqYards) : undefined,
        primeLocation: primeLocation || undefined,
        allottedBy: allottedBy || undefined,
        dimensions: dimensions || undefined,
        boundaries,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Plot creation failed");
      return;
    }
    const savedCode = body.data.plot?.code ?? body.data.code ?? code;
    router.push(plot?.id ? `/app/projects/${projectId}/plots/${plot.id}` : `/app/projects/${projectId}/ownership?created=${encodeURIComponent(savedCode)}`);
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    const viewport = mapViewport.current;
    if (!viewport) return;
    viewport.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  }

  function pan(event: PointerEvent<HTMLDivElement>) {
    const viewport = mapViewport.current;
    if (!viewport || !drag.current) return;
    viewport.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
    viewport.scrollTop = drag.current.top - (event.clientY - drag.current.y);
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={17} />
          <h3 className="font-semibold">Plot details</h3>
        </div>
        {lastPlot && !plot?.id ? <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={copyFromLastPlot}>Copy from last added plot</button> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label><span className="label">Plot code</span><input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="A-101" /></label>
          <label><span className="label">Plot area (square yards)</span><input className="input" inputMode="decimal" value={areaSqYards} onChange={(event) => setAreaSqYards(event.target.value)} /></label>
          <label><span className="label">Prime location <span className="font-normal text-slate-400">(optional)</span></span><input className="input" value={primeLocation} onChange={(event) => setPrimeLocation(event.target.value)} placeholder="Corner, park facing, main road..." /></label>
          <label><span className="label">Who is allotting</span><input className="input" value={allottedBy} onChange={(event) => setAllottedBy(event.target.value)} placeholder="Name / designation" /></label>
          <label><span className="label">Dimensions</span><input className="input" value={dimensions} onChange={(event) => setDimensions(event.target.value)} placeholder="For example, 30 ft x 60 ft" /></label>
      </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Project Map</h3>
            <p className="mt-1 text-xs text-slate-500">Use the full project plan as a reference while entering the plot boundaries.</p>
          </div>
          {cadFileId ? (
            <div className="flex items-center gap-1">
              <button type="button" className="btn-outline h-9 px-2" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 25))}><Minus size={16} /></button>
              <span className="w-14 text-center text-xs font-medium text-slate-600">{zoom}%</span>
              <button type="button" className="btn-outline h-9 px-2" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(300, value + 25))}><Plus size={16} /></button>
            </div>
          ) : null}
        </div>
        <div ref={mapViewport} className="mt-4 h-72 cursor-grab touch-none overflow-auto rounded-lg border border-slate-200 bg-slate-50 active:cursor-grabbing" onPointerDown={startPan} onPointerMove={pan} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          {cadFileId ? (
            <img
              src={`/api/v1/cad/${cadFileId}/preview`}
              alt="Full project map"
              className="mx-auto block max-w-none object-contain p-4 transition-[width]"
              style={{ width: `${zoom}%`, minWidth: "100%" }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500"><ZoomIn size={22} />No project map has been uploaded yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Plot boundaries</h3>
        <div className="mx-auto mt-5 grid max-w-4xl grid-cols-[minmax(180px,1fr)_minmax(180px,280px)_minmax(180px,1fr)] grid-rows-[auto_minmax(180px,280px)_auto] items-center gap-4">
          <div className="col-start-2 row-start-1 grid gap-2"><input aria-label="North boundary" className="input text-center" placeholder="North boundary details" value={boundaries.north} onChange={(event) => setBoundaries({ ...boundaries, north: event.target.value })} /><input aria-label="North plot dimensions" className="input text-center" placeholder="Plot dimensions" value={boundaries.northDimension} onChange={(event) => setBoundaries({ ...boundaries, northDimension: event.target.value })} /></div>
          <div className="col-start-1 row-start-2 grid gap-2"><input aria-label="West boundary" className="input text-center" placeholder="West boundary details" value={boundaries.west} onChange={(event) => setBoundaries({ ...boundaries, west: event.target.value })} /><input aria-label="West plot dimensions" className="input text-center" placeholder="Plot dimensions" value={boundaries.westDimension} onChange={(event) => setBoundaries({ ...boundaries, westDimension: event.target.value })} /></div>
          <img className="col-start-2 row-start-2 aspect-square w-full object-contain" src="/images/plot-directions.png" alt="North south east west directions" />
          <div className="col-start-3 row-start-2 grid gap-2"><input aria-label="East boundary" className="input text-center" placeholder="East boundary details" value={boundaries.east} onChange={(event) => setBoundaries({ ...boundaries, east: event.target.value })} /><input aria-label="East plot dimensions" className="input text-center" placeholder="Plot dimensions" value={boundaries.eastDimension} onChange={(event) => setBoundaries({ ...boundaries, eastDimension: event.target.value })} /></div>
          <div className="col-start-2 row-start-3 grid gap-2"><input aria-label="South boundary" className="input text-center" placeholder="South boundary details" value={boundaries.south} onChange={(event) => setBoundaries({ ...boundaries, south: event.target.value })} /><input aria-label="South plot dimensions" className="input text-center" placeholder="Plot dimensions" value={boundaries.southDimension} onChange={(event) => setBoundaries({ ...boundaries, southDimension: event.target.value })} /></div>
        </div>
      </section>

      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary w-fit" disabled={loading || !code}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        {plot?.id ? "Save plot details" : "Save plot"}
      </button>
    </form>
  );
}

function boundaryText(boundaries: unknown, key: string) {
  if (!boundaries || typeof boundaries !== "object" || Array.isArray(boundaries)) return "";
  const value = (boundaries as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function ManualSiteAssetForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("ROAD");
  const [deadline, setDeadline] = useState("");
  const [progressPct, setProgressPct] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/projects/${projectId}/site-assets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        progressPct: Number(progressPct),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Asset ${body.data.name} created.` : body.error ?? "Asset creation failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Route size={17} />
        <h3 className="text-sm font-semibold">Manual site part</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">Create roads, boundaries, gates, utilities, parks, clubhouse, drainage, or any non-plot part without Map.</p>
      <div className="mt-4 grid gap-3">
        <label><span className="label">Part name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="North boundary wall" /></label>
        <label><span className="label">Type</span><input className="input" value={type} onChange={(event) => setType(event.target.value)} placeholder="ROAD / BOUNDARY / UTILITY" /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Progress %</span><input className="input" inputMode="numeric" value={progressPct} onChange={(event) => setProgressPct(event.target.value)} /></label>
          <label><span className="label">Deadline</span><input className="input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
        </div>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !name || !type}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create site part
      </button>
    </form>
  );
}

export function ManualPlotZoneForm({ plotId }: { plotId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Structure");
  const [progressPct, setProgressPct] = useState("0");
  const [dueAt, setDueAt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/plots/${plotId}/checklist-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label,
        category,
        progressPct: Number(progressPct),
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Subpart ${body.data.label} created.` : body.error ?? "Subpart creation failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Wrench size={17} />
        <h3 className="text-sm font-semibold">Manual plot subpart</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">Create rooms, kitchen, bathroom, electrical, plumbing, garden, finishing, or any custom subpart without plot Map.</p>
      <div className="mt-4 grid gap-3">
        <label><span className="label">Subpart / checklist name</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ground floor bathroom plumbing" /></label>
        <label><span className="label">Category</span><input className="input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Plumbing / Electrical / Kitchen" /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Progress %</span><input className="input" inputMode="numeric" value={progressPct} onChange={(event) => setProgressPct(event.target.value)} /></label>
          <label><span className="label">Due date</span><input className="input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        </div>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !label || !category}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create subpart
      </button>
    </form>
  );
}
