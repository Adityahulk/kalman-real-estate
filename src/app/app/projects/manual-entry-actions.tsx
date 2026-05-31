"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Route, Wrench } from "lucide-react";

export function ManualPlotForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [priceInr, setPriceInr] = useState("");
  const [facing, setFacing] = useState("");
  const [notes, setNotes] = useState("");
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
        label: label || undefined,
        areaSqft: areaSqft ? Number(areaSqft) : undefined,
        priceInr: priceInr ? Number(priceInr) : undefined,
        facing: facing || undefined,
        notes: notes || undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Plot creation failed");
      return;
    }
    setMessage(`Plot ${body.data.plot.code} created.`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Building2 size={17} />
        <h3 className="text-sm font-semibold">Manual plot entry</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">Use this when there is no CAD. The plot still gets ownership, documents, registry, transfer, and audit workflows.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label><span className="label">Plot code</span><input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="A-101" /></label>
        <label><span className="label">Label/name</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} /></label>
        <label><span className="label">Area sq ft</span><input className="input" inputMode="decimal" value={areaSqft} onChange={(event) => setAreaSqft(event.target.value)} /></label>
        <label><span className="label">Value in INR</span><input className="input" inputMode="numeric" value={priceInr} onChange={(event) => setPriceInr(event.target.value)} /></label>
        <label><span className="label">Facing</span><input className="input" value={facing} onChange={(event) => setFacing(event.target.value)} placeholder="East / park facing" /></label>
        <label><span className="label">Inventory note</span><input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !code}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create plot manually
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
      <p className="mt-1 text-xs leading-5 text-slate-500">Create roads, boundaries, gates, utilities, parks, clubhouse, drainage, or any non-plot part without CAD.</p>
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
      <p className="mt-1 text-xs leading-5 text-slate-500">Create rooms, kitchen, bathroom, electrical, plumbing, garden, finishing, or any custom subpart without plot CAD.</p>
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
