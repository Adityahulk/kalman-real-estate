"use client";

import { Check, Download, Eye, FileText, Loader2, Map, Pencil, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUploader } from "@/components/file-uploader";

type PlotDocument = {
  id: string;
  status: string;
  fileAssetId: string | null;
  type?: string;
  number?: string | null;
  createdAt?: string;
};

export type SignedFileInfo = { id: string };

export function OwnershipPlotRow({
  href,
  plotId,
  plot,
  ownerName,
  area,
  development,
  allotmentStatus,
  document,
  signedFile,
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
  signedFile: SignedFileInfo | null;
  cadSource: { id: string; originalName: string; version: number } | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(document?.status ?? "");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | "">("");
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
  const waiting = Boolean(document && ["DRAFT", "GENERATED", "UNDER_REVIEW"].includes(status));
  const approvalReady = Boolean(waiting && document?.fileAssetId);
  // View PDF shows signed copy if available, otherwise generated PDF
  const viewPdfFileId = signedFile?.id ?? document?.fileAssetId ?? null;
  const hasGeneratedPdf = Boolean(document?.fileAssetId);
  const hasSignedCopy = Boolean(signedFile);

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
            {waiting && document?.fileAssetId ? <span className="chip bg-amber-100 text-amber-800">Waiting for approval</span> : null}
            {waiting && !document?.fileAssetId ? <span className="chip bg-slate-100 text-slate-700">Letter in progress</span> : null}
            {status === "APPROVED" || status === "ISSUED" ? <span className="chip bg-emerald-50 text-emerald-700">{status === "ISSUED" ? "Allotment issued" : "Allotment approved"}</span> : null}
            {status === "REJECTED" ? <span className="chip bg-rose-50 text-rose-700">Allotment rejected</span> : null}
          </div>

          {document ? (
            <div className="mt-2 text-xs text-slate-500">
              {document.number ?? "Letter draft"}{document.createdAt ? ` · ${new Date(document.createdAt).toLocaleDateString("en-IN")}` : ""}
              {hasSignedCopy ? <span className="ml-1 text-emerald-600">· Signed copy uploaded</span> : null}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">No allotment letter has been generated yet.</div>
          )}

          {(viewPdfFileId || approvalReady) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {viewPdfFileId ? (
                <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${viewPdfFileId}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer" title={hasSignedCopy ? "View signed copy" : "View generated PDF"}>
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
            </div>
          ) : null}

          {/* Download actions: generated PDF, signed PDF, upload new signed copy */}
          {hasGeneratedPdf && document ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <a className="btn-outline h-7 px-2 text-[11px] text-slate-500" href={`/api/v1/files/${document.fileAssetId}/download`} title="Download generated PDF" onClick={(event) => event.stopPropagation()}>
                <Download size={12} /> Generated
              </a>
              {hasSignedCopy && signedFile ? (
                <a className="btn-outline h-7 px-2 text-[11px] text-emerald-600" href={`/api/v1/files/${signedFile.id}/download`} title="Download signed copy" onClick={(event) => event.stopPropagation()}>
                  <Download size={12} /> Signed
                </a>
              ) : null}
              {status !== "REJECTED" ? (
                <FileUploader
                  compact
                  label={hasSignedCopy ? "Re-upload" : "Upload signed"}
                  ownerType="Plot"
                  ownerId={plotId}
                  visibility="OWNER_VISIBLE"
                  accept="application/pdf,image/*"
                  refreshOnUpload
                  metadata={{
                    documentType: "ALLOTMENT_LETTER",
                    documentNo: document.number ?? undefined,
                    documentDate: document.createdAt ? new Date(document.createdAt).toISOString() : undefined,
                    notes: "Signed version of allotment letter",
                    categoryKey: "signed-allotment-letter",
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
            <button className="btn-outline h-8 w-8 px-0 text-slate-600" type="button" title="Open letter" aria-label="Open letter" onClick={() => router.push(`${href}/letters/${document.id}`)}>
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
