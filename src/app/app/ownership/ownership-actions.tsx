"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus, Send } from "lucide-react";

type PlotOption = { id: string; code: string };
type OwnerOption = { id: string; name: string };

export function CreateOwnerForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/ownership/owners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "INDIVIDUAL", name, phone }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Owner created: ${payload.data.name}` : payload.error ?? "Owner creation failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Create owner</h2>
      <label className="mt-4 block">
        <span className="label">Name</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Phone</span>
        <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !name}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create owner
      </button>
    </form>
  );
}

export function AllotPlotForm({ plots, owners }: { plots: PlotOption[]; owners: OwnerOption[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [amountInr, setAmountInr] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/allot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerId, amountInr: Number(amountInr), sharePct: 100 }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Plot ${payload.data.plot.code} allotted.` : payload.error ?? "Allotment failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Allot plot</h2>
      <div className="mt-4 grid gap-3">
        <label>
          <span className="label">Plot</span>
          <select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Owner</span>
          <select className="input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Amount in INR</span>
          <input className="input" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} />
        </label>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !plotId || !ownerId}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
        Record allotment
      </button>
    </form>
  );
}

export function TransferPlotForm({ plots, owners }: { plots: PlotOption[]; owners: OwnerOption[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [buyerOwnerId, setBuyerOwnerId] = useState(owners[0]?.id ?? "");
  const [amountInr, setAmountInr] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/transfer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buyerOwnerId, amountInr: Number(amountInr) }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Plot ${payload.data.plot.code} transferred.` : payload.error ?? "Transfer failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Transfer plot</h2>
      <label className="mt-4 block"><span className="label">Plot</span><select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}</option>)}</select></label>
      <label className="mt-3 block"><span className="label">Buyer</span><select className="input" value={buyerOwnerId} onChange={(event) => setBuyerOwnerId(event.target.value)}>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
      <label className="mt-3 block"><span className="label">Amount in INR</span><input className="input" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !plotId || !buyerOwnerId}>{loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}Record transfer</button>
    </form>
  );
}

export function RegistryForm({ plots }: { plots: PlotOption[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [status, setStatus] = useState("Registry in progress");
  const [registryNo, setRegistryNo] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/registry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, registryNo }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Registry status saved." : body.error ?? "Registry update failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Registry update</h2>
      <label className="mt-4 block"><span className="label">Plot</span><select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}</option>)}</select></label>
      <label className="mt-3 block"><span className="label">Status</span><input className="input" value={status} onChange={(event) => setStatus(event.target.value)} /></label>
      <label className="mt-3 block"><span className="label">Registry no</span><input className="input" value={registryNo} onChange={(event) => setRegistryNo(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4">Save registry</button>
    </form>
  );
}
