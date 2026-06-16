"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

export function AddFirmFieldForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/firms/fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Could not add field");
      return;
    }
    setLabel("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-semibold">Add additional field</h2>
      <label className="mt-4 block">
        <span className="label">Field name</span>
        <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="RERA number" />
      </label>
      {message ? <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !label.trim()}>
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
        Add field
      </button>
    </form>
  );
}

export function OwnershipSettingsForm({ maxTransfersPerPlot }: { maxTransfersPerPlot: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(maxTransfersPerPlot));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/firms/ownership-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxTransfersPerPlot: Number(value) }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Ownership settings saved." : body.error ?? "Could not save settings");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-semibold">Ownership settings</h2>
      <label className="mt-4 block">
        <span className="label">Allowed accepted transfers per plot</span>
        <input className="input" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <p className="mt-2 text-xs text-slate-500">Default is 3. Once the accepted transfer count reaches this cap, users can only continue with registry.</p>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || Number(value) < 0}>
        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
        Save settings
      </button>
    </form>
  );
}
