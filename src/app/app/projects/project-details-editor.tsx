"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ProjectDetails = {
  id: string; name: string; city: string; state: string | null; address: string | null;
  developmentLicenses: unknown; reraNumber: string | null; landAreaAcres: string | null;
  siteContactPhone: string | null; totalPlots: number | null;
};

export function ProjectDetailsEditor({ project }: { project: ProjectDetails }) {
  const router = useRouter();
  const initialLicenses = Array.isArray(project.developmentLicenses) ? project.developmentLicenses.filter((item): item is string => typeof item === "string") : [];
  const [details, setDetails] = useState({
    name: project.name, city: project.city, state: project.state ?? "", address: project.address ?? "",
    reraNumber: project.reraNumber ?? "", landAreaAcres: project.landAreaAcres ?? "",
    siteContactPhone: project.siteContactPhone ?? "", totalPlots: String(project.totalPlots ?? ""),
  });
  const [licenses, setLicenses] = useState(initialLicenses.length ? initialLicenses : [""]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch(`/api/v1/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
      ...details, address: details.address || undefined, reraNumber: details.reraNumber || undefined,
      landAreaAcres: details.landAreaAcres ? Number(details.landAreaAcres) : undefined,
      totalPlots: Number(details.totalPlots), developmentLicenses: licenses.filter((value) => value.trim()),
    }) });
    const body = await response.json(); setLoading(false);
    setMessage(response.ok ? "Project details saved." : body.error ?? "Could not save project");
    if (response.ok) { setEditing(false); router.refresh(); }
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      <div className="flex justify-end"><button className="btn-outline" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Cancel edit" : "Edit details"}</button></div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries({ name: "Project name", city: "City", state: "State", reraNumber: "RERA number", landAreaAcres: "Land area (acres)", siteContactPhone: "Site contact number", totalPlots: "Total plots" }).map(([key, label]) => (
          <label key={key}><span className="label">{label}</span><input className="input disabled:bg-slate-50" disabled={!editing} value={details[key as keyof typeof details]} onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))} /></label>
        ))}
        <label className="md:col-span-2"><span className="label">Site address</span><textarea className="input min-h-20 disabled:bg-slate-50" disabled={!editing} value={details.address} onChange={(event) => setDetails((current) => ({ ...current, address: event.target.value }))} /></label>
      </div>
      <div><span className="label">License to develop</span><div className="mt-1 space-y-2">{licenses.map((license, index) => <div className="flex gap-2" key={index}><input className="input disabled:bg-slate-50" disabled={!editing} value={license} onChange={(event) => setLicenses((current) => current.map((item, i) => i === index ? event.target.value : item))} />{editing && licenses.length > 1 ? <button className="btn-outline px-3" type="button" onClick={() => setLicenses((current) => current.filter((_, i) => i !== index))}><Trash2 size={15} /></button> : null}</div>)}</div>{editing ? <button className="btn-ghost mt-2 px-0 text-xs" type="button" onClick={() => setLicenses((current) => [...current, ""])}><Plus size={14} /> Add license line</button> : null}</div>
      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{message}</div> : null}
      {editing ? <button className="btn-primary w-fit" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save details</button> : null}
    </form>
  );
}
