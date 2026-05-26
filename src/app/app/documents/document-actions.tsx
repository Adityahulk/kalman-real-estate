"use client";

import { FormEvent, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";

export function GenerateDocumentForm({ plots }: { plots: { id: string; code: string; ownerName: string }[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [type, setType] = useState("allotment_letter");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const selected = plots.find((plot) => plot.id === plotId);
    const response = await fetch("/api/v1/documents/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        recordType: "Plot",
        recordId: plotId,
        data: {
          plotCode: selected?.code,
          ownerName: selected?.ownerName,
        },
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Document queued: ${body.data.document.number}` : body.error ?? "Document generation failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Generate document</h2>
      <label className="mt-4 block">
        <span className="label">Type</span>
        <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="allotment_letter">Allotment letter</option>
          <option value="transfer_letter">Transfer letter</option>
          <option value="registry_status_letter">Registry status letter</option>
          <option value="contractor_work_order">Contractor work order</option>
        </select>
      </label>
      <label className="mt-3 block">
        <span className="label">Plot</span>
        <select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
          {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code} · {plot.ownerName}</option>)}
        </select>
      </label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !plotId}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Wand2 size={17} />}
        Generate PDF
      </button>
    </form>
  );
}

export function DocumentApprovalButtons({ documentId }: { documentId: string }) {
  const [message, setMessage] = useState("");

  async function decide(status: "APPROVED" | "ISSUED" | "REJECTED") {
    const endpoint = status === "REJECTED" ? "reject" : "approve";
    const response = await fetch(`/api/v1/documents/${documentId}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, notes: status }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Document ${status.toLowerCase()}.` : body.error ?? "Document update failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-outline h-8 px-3 text-xs" onClick={() => decide("APPROVED")}>Approve</button>
      <button className="btn-outline h-8 px-3 text-xs" onClick={() => decide("ISSUED")}>Issue</button>
      <button className="btn-outline h-8 px-3 text-xs" onClick={() => decide("REJECTED")}>Reject</button>
      {message ? <span className="text-xs text-slate-500">{message}</span> : null}
    </div>
  );
}
