"use client";

import { FormEvent, useState } from "react";
import { ClipboardList, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ProjectDetails = {
  id: string; name: string; city: string; state: string | null; address: string | null;
  developmentLicenses: unknown; reraNumber: string | null; landAreaAcres: string | null;
  siteContactPhone: string | null; totalPlots: number | null; customFields: Record<string, string>;
};
type CustomField = { id: string; key: string; label: string };

export function ProjectDetailsEditor({ project, customFields = [] }: { project: ProjectDetails; customFields?: CustomField[] }) {
  const router = useRouter();
  const initialLicenses = Array.isArray(project.developmentLicenses) ? project.developmentLicenses.filter((item): item is string => typeof item === "string") : [];
  const [details, setDetails] = useState({
    name: project.name, city: project.city, state: project.state ?? "", address: project.address ?? "",
    reraNumber: project.reraNumber ?? "", landAreaAcres: project.landAreaAcres ?? "",
    siteContactPhone: project.siteContactPhone ?? "", totalPlots: String(project.totalPlots ?? ""),
  });
  const [licenses, setLicenses] = useState(initialLicenses.length ? initialLicenses : [""]);
  const [customValues, setCustomValues] = useState<Record<string, string>>(project.customFields);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function cancelEditing() {
    setDetails({
      name: project.name, city: project.city, state: project.state ?? "", address: project.address ?? "",
      reraNumber: project.reraNumber ?? "", landAreaAcres: project.landAreaAcres ?? "",
      siteContactPhone: project.siteContactPhone ?? "", totalPlots: String(project.totalPlots ?? ""),
    });
    setLicenses(initialLicenses.length ? initialLicenses : [""]);
    setCustomValues(project.customFields);
    setMessage("");
    setEditing(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch(`/api/v1/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
      ...details, address: details.address || undefined, reraNumber: details.reraNumber || undefined,
      landAreaAcres: details.landAreaAcres ? Number(details.landAreaAcres) : undefined,
      totalPlots: Number(details.totalPlots), developmentLicenses: licenses.filter((value) => value.trim()),
      customFields: Object.fromEntries(customFields.map((field) => [field.key, customValues[field.key] ?? ""])),
    }) });
    const body = await response.json(); setLoading(false);
    setMessage(response.ok ? "Project details saved." : body.error ?? "Could not save project");
    if (response.ok) { setEditing(false); router.refresh(); }
  }

  if (!editing) {
    const detailItems = [
      ["Project name", project.name],
      ["City", project.city],
      ["State", project.state],
      ["RERA number", project.reraNumber],
      ["Land area", project.landAreaAcres ? `${project.landAreaAcres} acres` : null],
      ["Site contact", project.siteContactPhone],
      ["Total plots", project.totalPlots == null ? null : String(project.totalPlots)],
      ...customFields.map((field) => [field.label, project.customFields[field.key]]),
    ] as Array<[string, string | null | undefined]>;

    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2"><ClipboardList size={18} className="text-navy-700" /><h2 className="font-semibold">Project information</h2></div>
            <p className="mt-1 text-sm text-slate-500">The main information used across maps, files, ownership, and letters.</p>
          </div>
          <button className="btn-primary h-9" type="button" onClick={() => setEditing(true)}><Pencil size={15} /> Edit details</button>
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          {detailItems.map(([label, value]) => <DetailItem key={label} label={label} value={value} />)}
          <div className="sm:col-span-2 xl:col-span-3"><DetailItem label="Site address" value={project.address} multiline /></div>
        </div>
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold">Licences to develop</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {initialLicenses.map((license, index) => <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm" key={`${license}-${index}`}>{license}</div>)}
            {!initialLicenses.length ? <div className="text-sm text-slate-500">No development licence added.</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div><h2 className="font-semibold">Edit project information</h2><p className="mt-1 text-sm text-slate-500">Changes are used throughout this project.</p></div>
        <button className="btn-outline h-9" type="button" onClick={cancelEditing}>Cancel</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries({ name: "Project name", city: "City", state: "State", reraNumber: "RERA number", landAreaAcres: "Land area (acres)", siteContactPhone: "Site contact number", totalPlots: "Total plots" }).map(([key, label]) => (
          <label key={key}><span className="label">{label}</span><input className="input disabled:bg-slate-50" disabled={!editing} value={details[key as keyof typeof details]} onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))} /></label>
        ))}
        <label className="md:col-span-2"><span className="label">Site address</span><textarea className="input min-h-20 disabled:bg-slate-50" disabled={!editing} value={details.address} onChange={(event) => setDetails((current) => ({ ...current, address: event.target.value }))} /></label>
        {customFields.map((field) => (
          <label key={field.id}>
            <span className="label">{field.label}</span>
            <input className="input disabled:bg-slate-50" disabled={!editing} value={customValues[field.key] ?? ""} onChange={(event) => setCustomValues((current) => ({ ...current, [field.key]: event.target.value }))} />
          </label>
        ))}
      </div>
      <div><span className="label">License to develop</span><div className="mt-1 space-y-2">{licenses.map((license, index) => <div className="flex gap-2" key={index}><input className="input disabled:bg-slate-50" disabled={!editing} value={license} onChange={(event) => setLicenses((current) => current.map((item, i) => i === index ? event.target.value : item))} />{editing && licenses.length > 1 ? <button className="btn-outline px-3" type="button" onClick={() => setLicenses((current) => current.filter((_, i) => i !== index))}><Trash2 size={15} /></button> : null}</div>)}</div>{editing ? <button className="btn-ghost mt-2 px-0 text-xs" type="button" onClick={() => setLicenses((current) => [...current, ""])}><Plus size={14} /> Add license line</button> : null}</div>
      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{message}</div> : null}
      {editing ? <button className="btn-primary w-fit" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save details</button> : null}
    </form>
  );
}

function DetailItem({ label, value, multiline = false }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-medium text-navy-950 ${multiline ? "whitespace-pre-line leading-6" : ""}`}>{value?.trim() || "Not added"}</div>
    </div>
  );
}
