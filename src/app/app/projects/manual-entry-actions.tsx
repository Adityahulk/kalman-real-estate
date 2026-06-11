"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Minus, Plus, Route, Wrench, ZoomIn } from "lucide-react";

export function ManualPlotForm({ projectId, cadFileId }: { projectId: string; cadFileId?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [areaSqYards, setAreaSqYards] = useState("");
  const [priceInr, setPriceInr] = useState("");
  const [primeLocation, setPrimeLocation] = useState("");
  const [boundaries, setBoundaries] = useState({ north: "", south: "", east: "", west: "" });
  const [zoom, setZoom] = useState(100);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/projects/${projectId}/plots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        areaSqYards: areaSqYards ? Number(areaSqYards) : undefined,
        priceInr: priceInr ? Number(priceInr) : undefined,
        primeLocation: primeLocation || undefined,
        boundaries,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Plot creation failed");
      return;
    }
    router.push(`/app/projects/${projectId}/ownership?created=${encodeURIComponent(body.data.plot.code)}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Building2 size={17} />
          <h3 className="font-semibold">Plot details</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label><span className="label">Plot code</span><input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="A-101" /></label>
          <label><span className="label">Plot area (square yards)</span><input className="input" inputMode="decimal" value={areaSqYards} onChange={(event) => setAreaSqYards(event.target.value)} /></label>
          <label><span className="label">Sale price</span><input className="input" inputMode="numeric" value={priceInr} onChange={(event) => setPriceInr(event.target.value)} /></label>
          <label><span className="label">Prime location <span className="font-normal text-slate-400">(optional)</span></span><input className="input" value={primeLocation} onChange={(event) => setPrimeLocation(event.target.value)} placeholder="Corner, park facing, main road..." /></label>
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
        <div className="mt-4 h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
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
          <input aria-label="North boundary" className="input col-start-2 row-start-1 text-center" placeholder="North boundary details" value={boundaries.north} onChange={(event) => setBoundaries({ ...boundaries, north: event.target.value })} />
          <input aria-label="West boundary" className="input col-start-1 row-start-2 text-center" placeholder="West boundary details" value={boundaries.west} onChange={(event) => setBoundaries({ ...boundaries, west: event.target.value })} />
          <img className="col-start-2 row-start-2 aspect-square w-full object-contain" src="/images/plot-directions.png" alt="North south east west directions" />
          <input aria-label="East boundary" className="input col-start-3 row-start-2 text-center" placeholder="East boundary details" value={boundaries.east} onChange={(event) => setBoundaries({ ...boundaries, east: event.target.value })} />
          <input aria-label="South boundary" className="input col-start-2 row-start-3 text-center" placeholder="South boundary details" value={boundaries.south} onChange={(event) => setBoundaries({ ...boundaries, south: event.target.value })} />
        </div>
      </section>

      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary w-fit" disabled={loading || !code}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Save plot
      </button>
    </form>
  );
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
