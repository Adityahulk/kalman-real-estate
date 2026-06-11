"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectMapFieldEditor({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim() || loading) return;
    setLoading(true);
    const response = await fetch(`/api/v1/projects/file-fields/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: name.trim() }),
    });
    setLoading(false);
    if (response.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  async function remove() {
    if (loading || !window.confirm(`Delete "${label}" and its sub-options? Existing uploaded files will remain in the archive.`)) return;
    setLoading(true);
    const response = await fetch(`/api/v1/projects/file-fields/${id}`, { method: "DELETE" });
    setLoading(false);
    if (response.ok) router.refresh();
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input className="input h-9 min-w-0" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="btn-ghost h-9 px-2 text-emerald-700" type="button" aria-label="Save name" onClick={() => void save()} disabled={loading}><Check size={16} /></button>
        <button className="btn-ghost h-9 px-2" type="button" aria-label="Cancel editing" onClick={() => { setName(label); setEditing(false); }}><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="truncate font-medium">{label}</span>
      <div className="flex shrink-0 gap-1">
        <button className="btn-ghost h-8 px-2" type="button" aria-label={`Edit ${label}`} onClick={() => setEditing(true)}><Pencil size={14} /></button>
        <button className="btn-ghost h-8 px-2 text-rose-700" type="button" aria-label={`Delete ${label}`} onClick={() => void remove()} disabled={loading}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
