"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus } from "lucide-react";

export function CreateProjectForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [landAreaSqft, setLandAreaSqft] = useState("");
  const [siteContactPhone, setSiteContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        city,
        address: address || undefined,
        reraNumber: reraNumber || undefined,
        landAreaSqft: landAreaSqft ? Number(landAreaSqft) : undefined,
        siteContactPhone: siteContactPhone || undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Project creation failed");
      return;
    }
    router.push(`/app/projects/${body.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={compact ? "rounded-lg border border-slate-200 bg-white p-4" : "card p-5"}>
      <div className="flex items-center gap-2">
        <Building2 size={18} />
        <h2 className="font-semibold">Create project</h2>
      </div>
      <div className="mt-4 grid gap-3">
        <label>
          <span className="label">Project name</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Vrinda Enclave Phase 2" />
        </label>
        <label>
          <span className="label">City / region</span>
          <input className="input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Punjab / North India" />
        </label>
        <label>
          <span className="label">Site address</span>
          <textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label>
          <span className="label">RERA number / ID</span>
          <input className="input" value={reraNumber} onChange={(event) => setReraNumber(event.target.value)} placeholder="PBRERA-SAS79-PR..." />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="label">Land area sq ft</span>
            <input className="input" inputMode="decimal" value={landAreaSqft} onChange={(event) => setLandAreaSqft(event.target.value)} placeholder="217800" />
          </label>
          <label>
            <span className="label">Site contact phone</span>
            <input className="input" value={siteContactPhone} onChange={(event) => setSiteContactPhone(event.target.value)} placeholder="+91 98765 43210" />
          </label>
        </div>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !name || !city}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create and open workspace
      </button>
    </form>
  );
}
