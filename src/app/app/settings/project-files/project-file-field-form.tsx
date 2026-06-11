"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectFileFieldForm({ section = "PROJECT_FILES" }: { section?: "PROJECT_FILES" | "CAD" }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/v1/projects/file-fields", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, section }) });
    const body = await response.json(); setLoading(false);
    if (!response.ok) return setMessage(body.error ?? "Could not add field");
    setLabel(""); router.refresh();
  }
  return <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={submit}><h2 className="font-semibold">Add {section === "CAD" ? "CAD plan" : "project file"} field</h2><label className="mt-4 block"><span className="label">Field name</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={section === "CAD" ? "Landscape plan" : "Registry"} /></label>{message ? <div className="mt-3 text-sm text-rose-700">{message}</div> : null}<button className="btn-primary mt-4" disabled={loading || !label.trim()}>{loading ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} Add field</button></form>;
}
