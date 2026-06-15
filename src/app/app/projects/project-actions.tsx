"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { requestJson } from "@/lib/api-client";

type CreatedProject = { id: string };

export function CreateProjectForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [developmentLicenses, setDevelopmentLicenses] = useState([""]);
  const [reraNumber, setReraNumber] = useState("");
  const [landAreaAcres, setLandAreaAcres] = useState("");
  const [siteContactPhone, setSiteContactPhone] = useState("");
  const [totalPlots, setTotalPlots] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const project = await requestJson<CreatedProject>("/api/v1/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          city,
          state,
          address: address || undefined,
          developmentLicenses: developmentLicenses.filter((value) => value.trim()),
          reraNumber: reraNumber || undefined,
          landAreaAcres: landAreaAcres ? Number(landAreaAcres) : undefined,
          siteContactPhone: siteContactPhone || undefined,
          totalPlots: Number(totalPlots),
        }),
      });
      router.push(`/app/projects/${project.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Project creation failed");
    } finally {
      setLoading(false);
    }
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
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">City</span><input className="input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Mohali" /></label>
          <label><span className="label">State</span><input className="input" value={state} onChange={(event) => setState(event.target.value)} placeholder="Punjab" /></label>
        </div>
        <label>
          <span className="label">Site address</span>
          <textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <div>
          <span className="label">License to develop</span>
          <div className="mt-1 space-y-2">
            {developmentLicenses.map((license, index) => (
              <div className="flex gap-2" key={index}>
                <input className="input" value={license} onChange={(event) => setDevelopmentLicenses((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
                {developmentLicenses.length > 1 ? <button className="btn-outline px-3" type="button" onClick={() => setDevelopmentLicenses((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button> : null}
              </div>
            ))}
          </div>
          <button className="btn-ghost mt-2 px-0 text-xs" type="button" onClick={() => setDevelopmentLicenses((current) => [...current, ""])}><Plus size={14} /> Add license line</button>
        </div>
        <label>
          <span className="label">RERA number / ID</span>
          <input className="input" value={reraNumber} onChange={(event) => setReraNumber(event.target.value)} placeholder="PBRERA-SAS79-PR..." />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Land area (acres)</span><input className="input" inputMode="decimal" value={landAreaAcres} onChange={(event) => setLandAreaAcres(event.target.value)} placeholder="5" /></label>
          <label>
            <span className="label">Site contact phone</span>
            <input className="input" value={siteContactPhone} onChange={(event) => setSiteContactPhone(event.target.value)} placeholder="+91 98765 43210" />
          </label>
        </div>
        <label><span className="label">Total plots</span><input className="input" inputMode="numeric" value={totalPlots} onChange={(event) => setTotalPlots(event.target.value)} placeholder="100" /></label>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !name || !city || !state || !totalPlots}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create and open workspace
      </button>
    </form>
  );
}
