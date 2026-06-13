"use client";

import { Check, Eye, FileText, Loader2, Map, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlotDocument = {
  id: string;
  status: string;
  fileAssetId: string | null;
};

export function OwnershipPlotRow({
  href,
  plot,
  ownerName,
  area,
  development,
  allotmentStatus,
  document,
  cadSource,
}: {
  href: string;
  plot: string;
  ownerName: string;
  area: string;
  development: number | null;
  allotmentStatus: string;
  document: PlotDocument | null;
  cadSource: { id: string; originalName: string; version: number } | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(document?.status ?? "");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | "">("");
  const waiting = Boolean(document && ["DRAFT", "GENERATED", "UNDER_REVIEW"].includes(status));
  const approvalReady = Boolean(waiting && document?.fileAssetId);

  async function decide(nextStatus: "APPROVED" | "REJECTED") {
    if (!document || loading) return;
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
        {cadSource ? <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700"><Map size={12} /> CAD linked · v{cadSource.version}</div> : <div className="mt-1 text-[11px] text-slate-400">Manual record</div>}
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
        <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          {!document ? <span className="chip bg-slate-100 text-slate-700">{allotmentStatus}</span> : null}
          {waiting && document?.fileAssetId ? <span className="chip bg-amber-100 text-amber-800">Waiting for approval</span> : null}
          {waiting && !document?.fileAssetId ? <span className="chip bg-slate-100 text-slate-700">Letter in progress</span> : null}
          {status === "APPROVED" || status === "ISSUED" ? <span className="chip bg-emerald-50 text-emerald-700">{status === "ISSUED" ? "Allotment issued" : "Allotment approved"}</span> : null}
          {status === "REJECTED" ? <span className="chip bg-rose-50 text-rose-700">Allotment rejected</span> : null}
          {document?.fileAssetId ? <a className="btn-outline h-8 px-2 text-xs" href={`/api/v1/files/${document.fileAssetId}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer"><Eye size={14} /> View PDF</a> : null}
          {approvalReady ? (
            <>
              <button className="btn-outline h-8 px-2 text-xs text-emerald-700" type="button" onClick={() => void decide("APPROVED")} disabled={Boolean(loading)}>
                {loading === "APPROVED" ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Approve
              </button>
              <button className="btn-outline h-8 px-2 text-xs text-rose-700" type="button" onClick={() => void decide("REJECTED")} disabled={Boolean(loading)}>
                {loading === "REJECTED" ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />} Reject
              </button>
            </>
          ) : null}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button className="btn-primary h-8 px-3 text-xs" type="button" onClick={() => router.push(href)}>
            Open plot
          </button>
          <button className="btn-outline h-8 px-3 text-xs" type="button" onClick={() => router.push(`${href}?tab=plot-map`)}>
            <Map size={14} /> Plot CAD
          </button>
          {document ? (
            <button className="btn-outline h-8 px-3 text-xs" type="button" onClick={() => router.push(`${href}/letters/${document.id}`)}>
              <FileText size={14} /> Open letter
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
