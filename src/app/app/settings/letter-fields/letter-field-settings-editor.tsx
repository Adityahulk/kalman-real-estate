"use client";

import { FormEvent, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { letterSystemFields } from "@/lib/letter-system-fields";

type Field = { id: string; label: string; mapping: string | null };
type Category = { id: string; name: string; fields: Field[] };

export function LetterFieldSettingsEditor({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/v1/settings/letter-fields?kind=category", "POST", { name: categoryName });
    setCategoryName("");
  }

  async function mutate(url: string, method: string, body?: unknown) {
    setLoading(true); setMessage("");
    const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setMessage(result.error ?? "Could not save letter field settings.");
    router.refresh();
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
    <section className="self-start rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4"><h1 className="font-semibold">Letter fields</h1><p className="mt-1 text-sm text-slate-500">Create categories and reusable fields that can be mapped while setting a letter template.</p></div>
      <div className="divide-y divide-slate-100">
        {categories.map((category) => <CategoryEditor category={category} key={category.id} loading={loading} mutate={mutate} />)}
      </div>
      {!categories.length ? <div className="p-8 text-center text-sm text-slate-500">No letter-field categories yet.</div> : null}
    </section>
    <aside>
      <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={addCategory}>
        <h2 className="font-semibold">Add category</h2>
        <label className="mt-4 block"><span className="label">Category name</span><input className="input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Customer details" /></label>
        {message ? <div className="mt-3 text-sm text-rose-700">{message}</div> : null}
        <button className="btn-primary mt-4" disabled={loading || !categoryName.trim()}>{loading ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}Add category</button>
      </form>
    </aside>
  </div>;
}

function CategoryEditor({ category, loading, mutate }: { category: Category; loading: boolean; mutate: (url: string, method: string, body?: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [label, setLabel] = useState("");
  const [mapping, setMapping] = useState("");
  return <div className="p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {editing ? <div className="flex flex-1 gap-2"><input className="input h-9 max-w-sm" value={name} onChange={(event) => setName(event.target.value)} /><button className="btn-ghost h-9 px-2 text-emerald-700" onClick={() => void mutate(`/api/v1/settings/letter-fields/${category.id}?kind=category`, "PATCH", { name }).then(() => setEditing(false))}><Check size={15} /></button><button className="btn-ghost h-9 px-2" onClick={() => { setName(category.name); setEditing(false); }}><X size={15} /></button></div> : <h2 className="font-semibold">{category.name}</h2>}
      {!editing ? <div className="flex gap-1"><button className="btn-ghost h-8 px-2" onClick={() => setEditing(true)}><Pencil size={14} /></button><button className="btn-ghost h-8 px-2 text-rose-700" onClick={() => window.confirm(`Delete "${category.name}" and its fields?`) && void mutate(`/api/v1/settings/letter-fields/${category.id}?kind=category`, "DELETE")}><Trash2 size={14} /></button></div> : null}
    </div>
    <div className="mt-4 space-y-2">{category.fields.map((field) => <FieldEditor field={field} key={field.id} mutate={mutate} />)}</div>
    <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <input className="input h-9" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Field name" />
      <select className="input h-9" value={mapping} onChange={(event) => setMapping(event.target.value)}><option value="">Manual / no system mapping</option>{letterSystemFields.map((field) => <option value={field.value} key={field.value}>{field.category}: {field.label}</option>)}</select>
      <button className="btn-outline h-9" disabled={loading || !label.trim()} onClick={() => void mutate("/api/v1/settings/letter-fields", "POST", { categoryId: category.id, label, mapping: mapping || null }).then(() => { setLabel(""); setMapping(""); })}><Plus size={14} />Add field</button>
    </div>
  </div>;
}

function FieldEditor({ field, mutate }: { field: Field; mutate: (url: string, method: string, body?: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [mapping, setMapping] = useState(field.mapping ?? "");
  if (editing) return <div className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><input className="input h-9" value={label} onChange={(event) => setLabel(event.target.value)} /><select className="input h-9" value={mapping} onChange={(event) => setMapping(event.target.value)}><option value="">Manual / no system mapping</option>{letterSystemFields.map((item) => <option value={item.value} key={item.value}>{item.category}: {item.label}</option>)}</select><div className="flex gap-1"><button className="btn-ghost h-9 px-2 text-emerald-700" onClick={() => void mutate(`/api/v1/settings/letter-fields/${field.id}`, "PATCH", { label, mapping: mapping || null }).then(() => setEditing(false))}><Check size={14} /></button><button className="btn-ghost h-9 px-2" onClick={() => setEditing(false)}><X size={14} /></button></div></div>;
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><div><div className="text-sm font-medium">{field.label}</div><div className="text-xs text-slate-500">{field.mapping ?? "Manual field"}</div></div><div className="flex gap-1"><button className="btn-ghost h-8 px-2" onClick={() => setEditing(true)}><Pencil size={13} /></button><button className="btn-ghost h-8 px-2 text-rose-700" onClick={() => void mutate(`/api/v1/settings/letter-fields/${field.id}`, "DELETE")}><Trash2 size={13} /></button></div></div>;
}
