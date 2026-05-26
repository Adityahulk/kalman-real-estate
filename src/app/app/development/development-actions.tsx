"use client";

import { FormEvent, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";

export function ProgressForm({ assets }: { assets: { id: string; name: string }[] }) {
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [progressPct, setProgressPct] = useState("50");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/v1/development/site-assets/${assetId}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ progressPct: Number(progressPct), summary, visibleToOwner: false }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Progress update saved." : payload.error ?? "Progress update failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Update site progress</h2>
      <label className="mt-4 block">
        <span className="label">Asset</span>
        <select className="input" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="label">Progress %</span>
        <input className="input" value={progressPct} onChange={(event) => setProgressPct(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Site note</span>
        <textarea className="input min-h-24" value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !assetId || !summary}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
        Save progress
      </button>
    </form>
  );
}

export function ProgressPhotoPanel({ progressUpdates }: { progressUpdates: { id: string; summary: string }[] }) {
  const [progressId, setProgressId] = useState(progressUpdates[0]?.id ?? "");
  const [message, setMessage] = useState("");

  async function attach(file: { id: string; fileName: string }) {
    const response = await fetch(`/api/v1/development/progress/${progressId}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileAssetIds: [file.id], visibleToOwner: true, summary: "Progress photo uploaded." }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Photo attached: ${file.fileName}` : body.error ?? "Photo attach failed");
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Upload progress photo</h2>
      <label className="mt-4 block">
        <span className="label">Progress update</span>
        <select className="input" value={progressId} onChange={(event) => setProgressId(event.target.value)}>
          {progressUpdates.map((update) => <option key={update.id} value={update.id}>{update.summary}</option>)}
        </select>
      </label>
      <div className="mt-3">
        <FileUploader label="Upload photo" visibility="OWNER_VISIBLE" ownerType="ProgressUpdate" ownerId={progressId} accept="image/*" onUploaded={attach} />
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
    </div>
  );
}
