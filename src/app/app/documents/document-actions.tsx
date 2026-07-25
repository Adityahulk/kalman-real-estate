"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Wand2 } from "lucide-react";

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

export function DocumentApprovalButtons({
  documentId,
  status: initialStatus = "GENERATED",
  fileAssetId = null,
}: {
  documentId: string;
  status?: string;
  fileAssetId?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(initialStatus);

  const awaitingApproval = status === "SUBMITTED";
  const canApprove = Boolean(fileAssetId) && awaitingApproval;
  const canIssue = Boolean(fileAssetId) && (status === "APPROVED" || status === "SENT_FOR_SIGNATURE");

  async function decide(status: "APPROVED" | "ISSUED" | "REJECTED" | "CHANGES_REQUESTED") {
    const endpoint = status === "REJECTED" ? "reject" : status === "CHANGES_REQUESTED" ? "return" : "approve";
    const response = await fetch(`/api/v1/documents/${documentId}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, notes: status }),
    });
    const body = await response.json();
    if (response.ok) {
      setStatus(body.data?.status ?? status);
      setMessage(`Document ${status.toLowerCase()}.`);
      router.refresh();
      return;
    }
    setMessage(body.error ?? "Document update failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {awaitingApproval ? <button className="btn-outline h-8 px-3 text-xs" disabled={!canApprove} onClick={() => decide("APPROVED")}>Approve</button> : null}
      {canIssue ? <button className="btn-outline h-8 px-3 text-xs" onClick={() => decide("ISSUED")}>Issue</button> : null}
      {awaitingApproval ? <button className="btn-outline h-8 px-3 text-xs" onClick={() => decide("CHANGES_REQUESTED")}>Return for correction</button> : null}
      {awaitingApproval ? <button className="btn-outline h-8 px-3 text-xs text-rose-700" onClick={() => decide("REJECTED")}>Reject</button> : null}
      {message ? <span className="text-xs text-slate-500">{message}</span> : null}
    </div>
  );
}

export function DeleteDocumentButton({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!globalThis.window.confirm(`Archive ${documentName ?? "this letter"}? It will leave active views but remain recoverable in the audit trail.`)) return;
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/documents/${documentId}`, {
      method: "DELETE",
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-outline h-8 px-3 text-xs text-rose-700 hover:bg-rose-50" onClick={remove} disabled={loading}>
        <Trash2 size={14} />
        {loading ? "Archiving" : "Archive"}
      </button>
      {message ? <span className="text-xs text-rose-700">{message}</span> : null}
    </span>
  );
}
