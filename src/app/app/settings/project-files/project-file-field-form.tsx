"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectFileFieldForm({ section = "PROJECT_FILES", parentId }: { section?: "PROJECT_FILES" | "PROJECT_MAPS"; parentId?: string }) {
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
  const fieldType = parentId ? "sub-option" : section === "PROJECT_MAPS" ? "project map" : "project file";
  return <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={submit}><h2 className="font-semibold">Add {fieldType}</h2><label className="mt-4 block"><span className="label">Name</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={parentId ? "Sewage layout" : section === "PROJECT_MAPS" ? "Water sewage" : "Registry"} /></label>{message ? <div className="mt-3 text-sm text-rose-700">{message}</div> : null}<button className="btn-primary mt-4" disabled={loading || !label.trim()}>{loading ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} Add {fieldType}</button></form>;
}
