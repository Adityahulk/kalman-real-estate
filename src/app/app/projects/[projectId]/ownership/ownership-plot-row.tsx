"use client";

import { Check, Eye, FileText, Loader2, Map, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignedLetterUpload } from "@/components/signed-letter-upload";

type PlotDocument = {
  id: string | null;
  status: string;
  fileAssetId: string | null;
  signedFileAssetId?: string | null;
  viewFileAssetId?: string | null;
  type?: string;
  label?: string;
  number?: string | null;
  createdAt?: string;
};

export function OwnershipPlotRow({
  href,
  plotId,
  plot,
  ownerName,
  area,
  development,
  allotmentStatus,
  document,
  canApprove,
  canSign,
  cadSource,
}: {
  href: string;
  plotId: string;
  plot: string;
  ownerName: string;
  area: string;
  development: number | null;
  allotmentStatus: string;
  document: PlotDocument | null;
  canApprove: boolean;
  canSign: boolean;
  cadSource: { id: string; originalName: string; version: number } | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(document?.status ?? "");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | "">("");
  const [signedFileAssetId, setSignedFileAssetId] = useState(document?.signedFileAssetId ?? null);
  const [deleting, setDeleting] = useState(false);

  async function deletePlot() {
    if (deleting) return;
    if (!globalThis.window.confirm(`Delete plot ${plot}? This removes it from the ownership ledger.`)) return;
    setDeleting(true);
    const response = await fetch(`/api/v1/plots/${plotId}`, { method: "DELETE" });
    if (response.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      globalThis.window.alert("Could not delete this plot.");
    }
  }

  const waiting = status === "SUBMITTED";
  const inProgress = Boolean(document && ["DRAFT", "GENERATED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(status));
  const approvalReady = Boolean(canApprove && waiting && document?.id && document.fileAssetId);
  const viewFileAssetId = signedFileAssetId ?? document?.viewFileAssetId ?? document?.fileAssetId ?? null;
  const awaitingSignature = Boolean(document?.id && ["APPROVED", "SENT_FOR_SIGNATURE"].includes(status));
  const letterKind = document?.label ?? (document?.type?.toLowerCase().includes("transfer") ? "Transfer letter" : "Allotment letter");

  async function decide(nextStatus: "APPROVED" | "REJECTED") {
    if (!document?.id || loading) return;
    setLoading(nextStatus);
    const endpoint = nextStatus === "REJECTED" ? "reject" : "approve";
    const response = await fetch(`/api/v1/documents/${document.id}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, notes: nextStatus }),
    });
    setLoading("");
    if (response.ok) {
      setStatus(nextStatus);
      router.refresh();
    }
  }

  return (
    <tr
      className="cursor-pointer transition hover:bg-navy-50"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") router.push(href);
      }}
    >
      <td className="px-5 py-4">
        <div className="font-semibold text-navy-900">{plot}</div>
        {cadSource ? <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700"><Map size={12} /> Map linked · v{cadSource.version}</div> : <div className="mt-1 text-[11px] text-slate-400">Manual record</div>}
      </td>
      <td className="px-5 py-4">{ownerName}</td>
      <td className="px-5 py-4">{area}</td>
      <td className="px-5 py-4">
        {development === null ? (
          <span className="text-slate-500">Not started</span>
        ) : (
          <div className="flex min-w-32 items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gold-shine" style={{ width: `${development}%` }} /></div>
            <span className="text-xs font-medium text-slate-600">{development}%</span>
          </div>
        )}
      </td>
      <td className="px-5 py-4">
        <div
          className="min-w-[320px] rounded-xl border border-slate-200 bg-slate-50/80 p-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-2">
            {!document ? <span className="chip bg-slate-100 text-slate-700">{allotmentStatus}</span> : null}
            {waiting ? <span className="chip bg-amber-100 text-amber-800">Waiting for approval</span> : null}
            {inProgress ? <span className="chip bg-slate-100 text-slate-700">{letterKind} letter in progress</span> : null}
            {status === "APPROVED" || status === "SENT_FOR_SIGNATURE" ? <span className="chip bg-sky-50 text-sky-700">{letterKind} approved · awaiting signature</span> : null}
            {status === "ISSUED" ? <span className="chip bg-emerald-50 text-emerald-700">{letterKind} issued</span> : null}
            {status === "SIGNED" ? <span className="chip bg-emerald-50 text-emerald-700">{letterKind} signed</span> : null}
            {status === "REJECTED" ? <span className="chip bg-rose-50 text-rose-700">{letterKind} rejected</span> : null}
            {document && !["DRAFT", "GENERATED", "UNDER_REVIEW", "CHANGES_REQUESTED", "SUBMITTED", "APPROVED", "SENT_FOR_SIGNATURE", "ISSUED", "SIGNED", "REJECTED"].includes(status) ? (
              <span className="chip bg-emerald-50 text-emerald-700">{letterKind} · {status.replaceAll("_", " ")}</span>
            ) : null}
          </div>

          {document ? (
            <div className="mt-2 text-xs text-slate-500">
              {document.number ?? "Letter draft"}{document.createdAt ? ` · ${new Date(document.createdAt).toLocaleDateString("en-IN")}` : ""}
              {signedFileAssetId || (document.viewFileAssetId && document.viewFileAssetId !== document.fileAssetId) ? <span className="ml-1 text-emerald-600">· Signed copy uploaded</span> : null}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">No allotment letter has been generated yet.</div>
          )}

          {(viewFileAssetId || approvalReady) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {viewFileAssetId ? (
                <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${viewFileAssetId}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer">
                  <Eye size={14} />
                  View PDF
                </a>
              ) : null}
              {approvalReady ? (
                <>
                  <button className="btn-outline h-8 px-3 text-xs text-emerald-700" type="button" onClick={() => void decide("APPROVED")} disabled={Boolean(loading)}>
                    {loading === "APPROVED" ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    Approve
                  </button>
                  <button className="btn-outline h-8 px-3 text-xs text-rose-700" type="button" onClick={() => void decide("REJECTED")} disabled={Boolean(loading)}>
                    {loading === "REJECTED" ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                    Reject
                  </button>
                </>
              ) : null}
              {canSign && document?.id && (awaitingSignature || status === "SIGNED") ? (
                <SignedLetterUpload
                  documentId={document.id}
                  plotId={plotId}
                  documentType={document.type ?? "allotment_letter"}
                  documentNo={document.number}
                  documentDate={document.createdAt}
                  replacing={Boolean(signedFileAssetId)}
                  onSigned={(fileAssetId) => {
                    setSignedFileAssetId(fileAssetId);
                    setStatus("SIGNED");
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button className="btn-outline h-8 w-8 px-0 text-slate-600" type="button" title="Edit plot" aria-label="Edit plot" onClick={() => router.push(`${href}/edit`)}>
            <Pencil size={14} />
          </button>
          <button className="btn-outline h-8 w-8 px-0 text-slate-600" type="button" title="Plot map" aria-label="Open plot map" onClick={() => router.push(`${href}?tab=plot-map`)}>
            <Map size={14} />
          </button>
          {document ? (
            <button
              className="btn-outline h-8 w-8 px-0 text-slate-600"
              type="button"
              title={viewFileAssetId ? "View latest letter" : "Open letter draft"}
              aria-label={viewFileAssetId ? "View latest letter" : "Open letter draft"}
              onClick={() => {
                if (viewFileAssetId) {
                  globalThis.window.open(`/api/v1/files/${viewFileAssetId}/download?disposition=inline&proxy=1`, "_blank", "noopener,noreferrer");
                  return;
                }
                if (document.id) router.push(`${href}/letters/${document.id}`);
              }}
            >
              <FileText size={14} />
            </button>
          ) : null}
          <button className="btn-outline h-8 w-8 px-0 border-rose-300 text-rose-600 hover:bg-rose-50" type="button" title="Delete plot" aria-label="Delete plot" onClick={() => void deletePlot()} disabled={deleting}>
            {deleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}
