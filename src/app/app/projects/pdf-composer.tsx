"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Eye, FilePlus2, Loader2, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import { loadBrowserPdfJs } from "@/lib/pdfjs-browser";

type RevisionOperation = {
  id: string;
  type: "INSERT_BEFORE" | "INSERT_AFTER" | "REPLACE_PAGE" | "REPLACE_RANGE";
  targetPage: number;
  endPage?: number;
  sourceFileAssetId: string;
  sourcePages?: number[];
  label?: string;
  createdAt: string;
};

type Revision = {
  id: string;
  revisionNo: number;
  status: string;
  baseFileId: string;
  outputFileId: string | null;
  operations: RevisionOperation[];
  pageCount: number;
};

type ComposerDocument = {
  id: string;
  number: string | null;
  type: string;
  status: string;
  fileAssetId: string | null;
};

type UploadTarget = {
  provider: "S3" | "LOCAL";
  storageKey: string;
  url: string;
};

type UploadPlan = {
  primary: UploadTarget;
  fallback?: UploadTarget;
  preferredProvider?: "S3" | "LOCAL";
};

export function PdfComposer({
  document,
  revisions,
  backHref,
}: {
  document: ComposerDocument;
  revisions: Revision[];
  backHref: string;
}) {
  const [items, setItems] = useState(revisions);
  const [activeRevision, setActiveRevision] = useState<Revision | null>(() => revisions.find((revision) => revision.status === "DRAFT") ?? revisions[0] ?? null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState<"start" | "upload" | "render" | "approve" | "issue" | "">("");
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<{ type: RevisionOperation["type"]; targetPage: number } | null>(null);
  const [endPage, setEndPage] = useState("");

  const canEdit = activeRevision?.status === "DRAFT";
  const activeOperations = activeRevision?.operations ?? [];
  const outputFileId = activeRevision?.outputFileId ?? null;
  const pageCount = activeRevision?.pageCount ?? 0;

  useEffect(() => {
    if (!activeRevision) return;
    let cancelled = false;
    setThumbs([]);
    renderThumbnails(activeRevision.baseFileId, activeRevision.pageCount).then((next) => {
      if (!cancelled) setThumbs(next);
    }).catch(() => {
      if (!cancelled) setThumbs([]);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRevision?.baseFileId, activeRevision?.pageCount]);

  async function startRevision() {
    setLoading("start");
    setMessage(null);
    const response = await fetch(`/api/v1/documents/${document.id}/revisions`, { method: "POST" });
    const body = await response.json();
    setLoading("");
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Could not start page arrangement." });
      return;
    }
    const revision = normalizeRevision(body.data.revision);
    const nextRevisions = Array.isArray(body.data.revisions)
      ? body.data.revisions.map(normalizeRevision)
      : [revision, ...items];
    setItems(nextRevisions);
    setActiveRevision(revision);
    setMessage({ kind: "success", text: "Page arrangement draft started." });
  }

  async function uploadOperation(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activeRevision || !selectedAction) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setMessage({ kind: "error", text: "Only PDF, JPG, and PNG files can be added." });
      return;
    }

    setLoading("upload");
    setMessage(null);
    try {
      const fileAsset = await uploadComposerFile(file, activeRevision.id);
      const operationBody = {
        type: selectedAction.type === "REPLACE_PAGE" && endPage ? "REPLACE_RANGE" : selectedAction.type,
        targetPage: selectedAction.targetPage,
        endPage: endPage ? Number(endPage) : undefined,
        sourceFileAssetId: fileAsset.id,
        label: file.name,
      };
      const response = await fetch(`/api/v1/documents/${document.id}/revisions/${activeRevision.id}/operations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(operationBody),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not add page operation.");
      const revision = normalizeRevision(body.data.revision);
      replaceRevision(revision);
      setActiveRevision(revision);
      setSelectedAction(null);
      setEndPage("");
      setMessage({ kind: "success", text: "Page change added. Generate the final PDF when ready." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setLoading("");
      event.target.value = "";
    }
  }

  async function removeOperation(operationId: string) {
    if (!activeRevision) return;
    setMessage(null);
    const response = await fetch(`/api/v1/documents/${document.id}/revisions/${activeRevision.id}/operations/${operationId}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Could not remove operation." });
      return;
    }
    const revision = normalizeRevision(body.data.revision);
    replaceRevision(revision);
    setActiveRevision(revision);
  }

  async function renderFinal() {
    if (!activeRevision) return;
    setLoading("render");
    setMessage(null);
    const response = await fetch(`/api/v1/documents/${document.id}/revisions/${activeRevision.id}/render`, { method: "POST" });
    const body = await response.json();
    setLoading("");
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Final PDF generation failed." });
      return;
    }
    const revision = normalizeRevision(body.data.revision);
    replaceRevision(revision);
    setActiveRevision(revision);
    setMessage({ kind: "success", text: "Final PDF generated. Preview and approve or issue it." });
  }

  async function decide(status: "APPROVED" | "ISSUED") {
    if (!activeRevision) return;
    setLoading(status === "ISSUED" ? "issue" : "approve");
    setMessage(null);
    const response = await fetch(`/api/v1/documents/${document.id}/revisions/${activeRevision.id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await response.json();
    setLoading("");
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Could not update revision status." });
      return;
    }
    const revision = normalizeRevision(body.data.revision);
    replaceRevision(revision);
    setActiveRevision(revision);
    setMessage({ kind: "success", text: `Revision ${status.toLowerCase()}. This is now the current document PDF.` });
  }

  function replaceRevision(revision: Revision) {
    setItems((current) => current.map((item) => item.id === revision.id ? revision : item));
  }

  const operationsByPage = useMemo(() => groupOperationsByPage(activeOperations), [activeOperations]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100">
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-navy-900" href={backHref}>
                <ArrowLeft size={16} />
                Back to Letter Studio
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-navy-900 md:text-xl">{document.number ?? document.type}</h1>
                {activeRevision ? <span className="chip bg-slate-100 text-slate-700">Revision {activeRevision.revisionNo} · {activeRevision.status}</span> : null}
                {activeRevision ? <span className="chip bg-slate-100 text-slate-700">{pageCount} source pages</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={startRevision} disabled={Boolean(loading)}>
                {loading === "start" ? <Loader2 className="animate-spin" size={14} /> : <RefreshCcw size={14} />}
                New revision
              </button>
              <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={renderFinal} disabled={!canEdit || !activeOperations.length || Boolean(loading)}>
                {loading === "render" ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
                Generate final PDF
              </button>
              {outputFileId ? (
                <a className="btn-outline h-9 px-3 text-xs" href={`/api/v1/files/${outputFileId}/download?disposition=inline`} target="_blank" rel="noreferrer">
                  <Eye size={14} />
                  Preview
                </a>
              ) : null}
              {outputFileId ? (
                <a className="btn-gold h-9 px-3 text-xs" href={`/api/v1/files/${outputFileId}/download`}>
                  <Download size={14} />
                  Download
                </a>
              ) : null}
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => decide("APPROVED")} disabled={!outputFileId || Boolean(loading)}>
                {loading === "approve" ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => decide("ISSUED")} disabled={!outputFileId || Boolean(loading)}>
                {loading === "issue" ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                Issue
              </button>
            </div>
          </div>
          {message ? (
            <div className={`rounded-lg px-3 py-2 text-sm ${message.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {message.text}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          {!document.fileAssetId ? (
            <EmptyState title="Generate the letter PDF first" body="Open Letter Studio, generate the PDF, then arrange pages." />
          ) : !activeRevision ? (
            <div className="grid min-h-[520px] place-items-center text-center">
              <div>
                <FilePlus2 className="mx-auto mb-3 text-slate-400" size={38} />
                <h2 className="text-lg font-semibold text-navy-900">Start page arrangement</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500">Create a revision to insert Aadhaar/PAN pages or replace signed pages without changing the original PDF.</p>
                <button type="button" className="btn-primary mx-auto mt-4" onClick={startRevision} disabled={Boolean(loading)}>
                  {loading === "start" ? <Loader2 className="animate-spin" size={17} /> : <FilePlus2 size={17} />}
                  Start arranging pages
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: pageCount }, (_, index) => {
                const page = index + 1;
                const pageOps = operationsByPage.get(page) ?? [];
                return (
                  <div key={page} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="grid min-h-52 place-items-center bg-slate-200/70 p-3">
                      {thumbs[index] ? (
                        <img className="max-h-48 rounded border border-slate-300 bg-white shadow-sm" src={thumbs[index]} alt={`Page ${page}`} />
                      ) : (
                        <div className="grid h-48 w-36 place-items-center rounded border border-slate-300 bg-white text-sm text-slate-500">Page {page}</div>
                      )}
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-navy-900">Page {page}</div>
                        {pageOps.length ? <span className="chip bg-amber-50 text-amber-800">{pageOps.length} change{pageOps.length === 1 ? "" : "s"}</span> : null}
                      </div>
                      {canEdit ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => setSelectedAction({ type: "INSERT_BEFORE", targetPage: page })}>Before</button>
                          <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => setSelectedAction({ type: "INSERT_AFTER", targetPage: page })}>After</button>
                          <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => setSelectedAction({ type: "REPLACE_PAGE", targetPage: page })}>Replace</button>
                        </div>
                      ) : null}
                      {pageOps.length ? (
                        <div className="space-y-1.5">
                          {pageOps.map((operation) => (
                            <div key={operation.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-xs text-slate-600">
                              <span>{operationLabel(operation)}</span>
                              {canEdit ? (
                                <button type="button" className="text-rose-600 hover:text-rose-700" onClick={() => removeOperation(operation.id)} aria-label="Remove operation">
                                  <Trash2 size={13} />
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h2 className="font-semibold text-navy-900">Add signed or supporting pages</h2>
            {selectedAction ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {selectedAction.type.replaceAll("_", " ").toLowerCase()} at page <strong>{selectedAction.targetPage}</strong>
                </div>
                {selectedAction.type === "REPLACE_PAGE" ? (
                  <label>
                    <span className="label">Replace through page, optional</span>
                    <input className="input" type="number" min={selectedAction.targetPage} max={pageCount} value={endPage} onChange={(event) => setEndPage(event.target.value)} placeholder={`Only page ${selectedAction.targetPage}`} />
                  </label>
                ) : null}
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    {loading === "upload" ? <Loader2 className="animate-spin" size={17} /> : <UploadCloud size={17} />}
                    Upload PDF / JPG / PNG
                  </span>
                  <input className="hidden" type="file" accept="application/pdf,image/jpeg,image/png" onChange={uploadOperation} disabled={loading === "upload"} />
                  <span className="btn-outline h-8 px-3 text-xs">Choose file</span>
                </label>
                <button type="button" className="btn-outline w-full justify-center" onClick={() => { setSelectedAction(null); setEndPage(""); }}>
                  Cancel
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-500">Choose Insert before, Insert after, or Replace on any page thumbnail. Then upload the supporting or signed file.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h2 className="font-semibold text-navy-900">Revision history</h2>
            <div className="mt-3 space-y-2">
              {items.map((revision) => (
                <button
                  key={revision.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${activeRevision?.id === revision.id ? "border-navy-900 bg-navy-50 text-navy-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  onClick={() => setActiveRevision(revision)}
                >
                  <div className="font-medium">Revision {revision.revisionNo}</div>
                  <div className="mt-1 text-xs">{revision.status} · {revision.operations.length} operation{revision.operations.length === 1 ? "" : "s"}</div>
                </button>
              ))}
              {!items.length ? <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No revisions yet.</div> : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function renderThumbnails(fileAssetId: string, pageCount: number) {
  if (!pageCount) return [];
  const pdfjs = await loadBrowserPdfJs();
  const task = pdfjs.getDocument({
    url: `/api/v1/files/${fileAssetId}/download?disposition=inline&proxy=1`,
  });
  const pdf = await task.promise;
  const images: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 0.24 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    images.push(canvas.toDataURL("image/png"));
  }
  return images;
}

async function uploadComposerFile(file: File, revisionId: string) {
  const metadataResponse = await fetch("/api/v1/files/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      visibility: "TEAM",
      ownerType: "GeneratedDocumentRevision",
      ownerId: revisionId,
      documentType: "OTHER",
      notes: "PDF composer source page",
    }),
  });
  const metadata = await metadataResponse.json();
  if (!metadataResponse.ok) throw new Error(metadata.error ?? "File upload could not start.");

  const target = await uploadToTarget(metadata.data.upload as UploadPlan, file);
  const completeResponse = await fetch(`/api/v1/files/${metadata.data.file.id}/upload-complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      storageProvider: target.provider,
      storageKey: target.storageKey,
      sizeBytes: file.size,
    }),
  });
  const complete = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(complete.error ?? "File uploaded, but could not be attached.");
  return complete.data as { id: string; fileName: string };
}

async function uploadToTarget(upload: UploadPlan, file: File): Promise<UploadTarget> {
  try {
    await putFile(upload.primary, file);
    return upload.primary;
  } catch (error) {
    if (!upload.fallback) throw error;
    await putFile(upload.fallback, file);
    return upload.fallback;
  }
}

async function putFile(target: UploadTarget, file: File) {
  const isLocal = target.provider === "LOCAL" || target.url.startsWith("/");
  const response = await fetch(target.url, {
    method: "PUT",
    credentials: isLocal ? "include" : "omit",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error(`${target.provider} upload failed`);
}

function normalizeRevision(value: Revision): Revision {
  return {
    ...value,
    operations: Array.isArray(value.operations) ? value.operations : [],
  };
}

function groupOperationsByPage(operations: RevisionOperation[]) {
  const map = new Map<number, RevisionOperation[]>();
  for (const operation of operations) {
    const current = map.get(operation.targetPage) ?? [];
    current.push(operation);
    map.set(operation.targetPage, current);
  }
  return map;
}

function operationLabel(operation: RevisionOperation) {
  const label = operation.label ? ` · ${operation.label}` : "";
  if (operation.type === "REPLACE_RANGE") return `Replace ${operation.targetPage}-${operation.endPage}${label}`;
  return `${operation.type.replaceAll("_", " ").toLowerCase()}${label}`;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[520px] place-items-center text-center">
      <div>
        <FilePlus2 className="mx-auto mb-3 text-slate-400" size={38} />
        <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">{body}</p>
      </div>
    </div>
  );
}
