"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Plus } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";

type Approval = {
  id: string;
  type: string;
  title: string;
  number: string | null;
  authority: string | null;
  version: number;
  status: string;
  projectName: string | null;
  fileAssetId: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  expiryState: string;
};

const TYPES = ["RERA", "LDC", "CLU", "NOC", "LICENSE", "AGREEMENT", "GOVT_LETTER"];

function expiryChip(state: string, expiresAt: string | null) {
  if (state === "expired") return <span className="chip bg-rose-50 text-rose-700">Expired {expiresAt ? new Date(expiresAt).toLocaleDateString() : ""}</span>;
  if (state === "expiring") return <span className="chip bg-amber-50 text-amber-800">Expiring {expiresAt ? new Date(expiresAt).toLocaleDateString() : ""}</span>;
  if (state === "valid") return <span className="chip bg-emerald-50 text-emerald-700">Valid till {expiresAt ? new Date(expiresAt).toLocaleDateString() : ""}</span>;
  return <span className="chip bg-slate-100 text-slate-600">No expiry</span>;
}

export function LiaisonManager({
  initial,
  projects,
  canManage,
}: {
  initial: Approval[];
  projects: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [items] = useState(initial);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [type, setType] = useState("RERA");
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [authority, setAuthority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [fileAssetId, setFileAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/v1/liaison/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type, title, number: number || undefined, authority: authority || undefined,
        projectId: projectId || undefined,
        issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        fileAssetId: fileAssetId || undefined,
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setMessage({ kind: "error", text: body?.error ?? "Could not save." }); return; }
    setMessage({ kind: "success", text: `${title} added.` });
    setTitle(""); setNumber(""); setAuthority(""); setIssuedAt(""); setExpiresAt(""); setFileAssetId(null);
    setShowForm(false);
    router.refresh();
  }

  async function uploadNewVersion(id: string, uploadedFileId: string) {
    setMessage(null);
    const response = await fetch(`/api/v1/liaison/approvals/${id}/version`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileAssetId: uploadedFileId }),
    });
    const body = await response.json().catch(() => null);
    setMessage(response.ok ? { kind: "success", text: "New version saved; previous version archived." } : { kind: "error", text: body?.error ?? "Failed." });
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${message.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message.text}</div>
      ) : null}

      {canManage ? (
        <div>
          <button className="btn-primary" type="button" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> {showForm ? "Close" : "Add approval"}
          </button>
        </div>
      ) : null}

      {canManage && showForm ? (
        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">New approval document</h2></div>
          <form onSubmit={createApproval} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="block"><span className="label">Type</span>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </label>
            <label className="block"><span className="label">Title</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <label className="block"><span className="label">Number</span><input className="input" value={number} onChange={(e) => setNumber(e.target.value)} /></label>
            <label className="block"><span className="label">Issuing authority</span><input className="input" value={authority} onChange={(e) => setAuthority(e.target.value)} /></label>
            <label className="block"><span className="label">Project (optional)</span>
              <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All / firm-wide</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Issued date</span><input className="input" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} /></label>
            <label className="block"><span className="label">Expiry date</span><input className="input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
            <div className="md:col-span-2 xl:col-span-3">
              <span className="label">Document file</span>
              <FileUploader label={fileAssetId ? "File attached ✓" : "Upload document"} ownerType="ApprovalDocument" visibility="TEAM" accept="application/pdf,image/*" metadata={{ categoryKey: "government-approval", documentType: "OTHER" }} onUploaded={(f) => setFileAssetId(f.id)} />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <button className="btn-primary w-fit" disabled={saving || !title}>{saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}Save approval</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Active approvals ({items.length})</h2></div>
        <div className="divide-y divide-slate-100">
          {items.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-navy-100 text-navy-800">{a.type}</span>
                  <span className="font-medium text-navy-900">{a.title}</span>
                  <span className="chip bg-slate-100 text-slate-600">v{a.version}</span>
                  {expiryChip(a.expiryState, a.expiresAt)}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {a.number ? `No. ${a.number}` : "No number"}
                  {a.authority ? ` · ${a.authority}` : ""}
                  {a.projectName ? ` · ${a.projectName}` : " · firm-wide"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {a.fileAssetId ? (
                  <a className="btn-outline h-9 px-3 text-xs" href={`/api/v1/files/${a.fileAssetId}/download`}><Download size={13} /> Download</a>
                ) : null}
                {canManage ? (
                  <FileUploader label="Upload new version" compact ownerType="ApprovalDocument" ownerId={a.id} visibility="TEAM" accept="application/pdf,image/*" metadata={{ categoryKey: "government-approval", documentType: "OTHER" }} onUploaded={(f) => void uploadNewVersion(a.id, f.id)} />
                ) : null}
              </div>
            </div>
          ))}
          {!items.length ? <div className="p-8 text-center text-sm text-slate-500">No approvals recorded yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
