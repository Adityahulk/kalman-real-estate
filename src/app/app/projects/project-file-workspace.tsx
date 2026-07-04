"use client";

import { useRef, useState } from "react";
import { Download, File, Mail, MessageCircle, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/file-uploader";
import { FileActions } from "@/components/file-actions";
import { FilePreview } from "@/components/file-preview";

type FileItem = { id: string; fileName: string; mimeType: string; createdAt: Date | string; categoryLabel?: string };

export function ProjectFileWorkspace({ projectId, label, categoryKey, files, canUpload = true }: { projectId: string; label: string; categoryKey?: string; files: FileItem[]; canUpload?: boolean }) {
  const router = useRouter();
  const previewRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? "");
  const [shareMode, setShareMode] = useState(false);
  const [shareIds, setShareIds] = useState<Set<string>>(new Set());
  const selected = files.find((file) => file.id === selectedId) ?? files[0];
  const selectedShareFiles = files.filter((file) => shareIds.has(file.id));

  function selectFile(fileId: string) {
    setSelectedId(fileId);
    window.requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function toggleShare(fileId: string) {
    setShareIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  async function shareText() {
    const links = await Promise.all(selectedShareFiles.map(async (file) => {
      const response = await fetch(`/api/v1/files/${file.id}/share`);
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data?.url) throw new Error(body?.error ?? `Could not create share link for ${file.fileName}`);
      return `${file.fileName}: ${body.data.url}`;
    }));
    return links.join("\n");
  }

  async function nativeShare() {
    if (!selectedShareFiles.length) return;
    if (navigator.share) {
      const shareFiles = await Promise.all(selectedShareFiles.map(async (file) => {
        const response = await fetch(`/api/v1/files/${file.id}/download?proxy=1`);
        if (!response.ok) throw new Error("Could not prepare file for sharing");
        const blob = await response.blob();
        return new globalThis.File([blob], file.fileName, { type: file.mimeType || blob.type || "application/octet-stream" });
      })).catch(() => []);
      if (shareFiles.length && navigator.canShare?.({ files: shareFiles })) {
        await navigator.share({ title: "Project files", files: shareFiles }).catch(() => undefined);
        return;
      }
      const text = await shareText();
      await navigator.share({ title: "Project files", text }).catch(() => undefined);
      return;
    }
    const text = await shareText();
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    window.alert("File links copied. You can paste them into any app.");
  }

  async function shareViaEmail() {
    try {
      const text = await shareText();
      window.open(`mailto:?subject=${encodeURIComponent("Project files")}&body=${encodeURIComponent(text)}`, "_self");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create share links.");
    }
  }

  async function shareViaWhatsApp() {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const text = await shareText();
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (popup) popup.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      popup?.close();
      window.alert(error instanceof Error ? error.message : "Could not create share links.");
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section ref={previewRef} className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">{selected ? selected.fileName : `No ${label} uploaded`}</h2>{selected ? <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${selected.id}/download`}><Download size={14} /> Download</a> : null}</div>
        {selected ? <FilePreview id={selected.id} fileName={selected.fileName} mimeType={selected.mimeType} /> : <div className="flex h-[calc(100vh-16rem)] items-center justify-center text-sm text-slate-500">Upload the first file to preview it here.</div>}
      </section>
      <aside className="min-h-0 space-y-4 overflow-auto">
        {canUpload && categoryKey ? <FileUploader label={`Upload new ${label}`} ownerType="Project" ownerId={projectId} visibility="TEAM" metadata={{ categoryKey }} onUploaded={() => router.refresh()} /> : null}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div className="font-semibold">{canUpload ? "Previous files" : "Matching files"}</div>
            {files.length ? <button className="btn-outline h-8 px-2 text-xs" type="button" onClick={() => { setShareMode((value) => !value); setShareIds(new Set()); }}>{shareMode ? <X size={13} /> : <Share2 size={13} />}{shareMode ? "Cancel" : "Share"}</button> : null}
          </div>
          {shareMode ? (
            <div className="space-y-2 border-b border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-600">Select files, then choose how to share their download links.</div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary h-8 px-3 text-xs" type="button" disabled={!shareIds.size} onClick={() => void nativeShare()}><Share2 size={13} /> Share</button>
                <button className="btn-outline h-8 px-3 text-xs" type="button" disabled={!shareIds.size} onClick={() => void shareViaEmail()}><Mail size={13} /> Email</button>
                <button className="btn-outline h-8 px-3 text-xs" type="button" disabled={!shareIds.size} onClick={() => void shareViaWhatsApp()}><MessageCircle size={13} /> WhatsApp</button>
              </div>
            </div>
          ) : null}
          <div className="divide-y divide-slate-100">
            {files.map((file) => <div className={`p-3 ${selected?.id === file.id ? "bg-navy-100" : ""}`} key={file.id}>
              <div className="flex items-start gap-2">
                {shareMode ? <input className="mt-1 size-4" type="checkbox" checked={shareIds.has(file.id)} onChange={() => toggleShare(file.id)} aria-label={`Share ${file.fileName}`} /> : null}
                <button className="flex min-w-0 flex-1 items-start gap-2 text-left" type="button" onClick={() => selectFile(file.id)}><File className="mt-0.5 shrink-0" size={15} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{file.fileName}</span>{file.categoryLabel ? <span className="block truncate text-xs text-slate-500">{file.categoryLabel}</span> : null}<span className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleString()}</span></span></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1"><a className="btn-ghost h-8 px-2 text-xs" href={`/api/v1/files/${file.id}/download`}><Download size={13} /> Download</a><FileActions fileId={file.id} fileName={file.fileName} /></div>
            </div>)}
            {!files.length ? <div className="p-4 text-sm text-slate-500">No files yet.</div> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
