"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectFileFieldForm({ section = "PROJECT_FILES", parentId, compact = false }: { section?: "PROJECT_FILES" | "PROJECT_MAPS" | "PROJECT_DETAILS" | "DEVELOPMENT_TASK_CATEGORIES"; parentId?: string; compact?: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/v1/projects/file-fields", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, section, parentId }) });
    const body = await response.json(); setLoading(false);
    if (!response.ok) return setMessage(body.error ?? "Could not add field");
    setLabel(""); router.refresh();
  }
  const fieldType = parentId ? "sub-option" : section === "PROJECT_MAPS" ? "map type" : section === "PROJECT_DETAILS" ? "detail field" : section === "DEVELOPMENT_TASK_CATEGORIES" ? "task category" : "file category";
  return <form className={compact ? "rounded-lg bg-slate-50 p-3" : "rounded-lg border border-slate-200 bg-white p-5"} onSubmit={submit}>
    <h2 className={compact ? "text-sm font-semibold" : "font-semibold"}>Add {fieldType}</h2>
    {!compact ? <p className="mt-1 text-xs leading-5 text-slate-500">{section === "PROJECT_MAPS" ? "Create another plan type available in every project." : section === "PROJECT_FILES" ? "Create a main category available in every project." : "This field will be available when a project is created or edited."}</p> : null}
    <div className={compact ? "mt-2 flex gap-2" : "mt-4"}>
      <label className="block min-w-0 flex-1"><span className={compact ? "sr-only" : "label"}>Name</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={parentId ? "e.g. Sewage layout" : section === "PROJECT_MAPS" ? "e.g. Water sewage" : section === "DEVELOPMENT_TASK_CATEGORIES" ? "e.g. Boundary wall" : "e.g. Registry"} /></label>
      <button className={compact ? "btn-outline shrink-0 px-3" : "btn-primary mt-4"} disabled={loading || !label.trim()}>{loading ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} {compact ? "Add" : `Add ${fieldType}`}</button>
    </div>
    {message ? <div className="mt-3 text-sm text-rose-700">{message}</div> : null}
  </form>;
}
