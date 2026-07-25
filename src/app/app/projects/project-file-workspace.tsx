"use client";

import { useRef, useState } from "react";
import { Download, File, Mail, MessageCircle, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/file-uploader";
import { FileActions } from "@/components/file-actions";
import { FilePreview } from "@/components/file-preview";
import { createDirectShareLinks, shareFiles } from "@/lib/file-sharing";

type FileItem = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: Date | string;
  categoryLabel?: string;
  version?: number;
  uploadedByName?: string;
};

export function ProjectFileWorkspace({ projectId, label, categoryKey, files, canUpload = true }: { projectId: string; label: string; categoryKey?: string; files: FileItem[]; canUpload?: boolean }) {
  const router = useRouter();
  const previewRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? "");
  const [shareMode, setShareMode] = useState(false);
  const [shareIds, setShareIds] = useState<Set<string>>(new Set());
  const [shareBusy, setShareBusy] = useState<"native" | "email" | "whatsapp" | null>(null);
  const [shareMessage, setShareMessage] = useState("");
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
    const urls = await createDirectShareLinks(selectedShareFiles);
    const count = selectedShareFiles.length;
    return `${count} file${count === 1 ? "" : "s"} shared with you:\n${urls.join("\n")}`;
  }

  async function nativeShare() {
    if (!selectedShareFiles.length || shareBusy) return;
    setShareBusy("native");
    setShareMessage("");
    try {
      if (await shareFiles(selectedShareFiles, "Project files")) return;
      setShareMessage("This browser cannot attach files to a share target. Use the mobile app or a browser that supports file sharing.");
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "Could not prepare files for sharing.");
    } finally {
      setShareBusy(null);
    }
  }

  async function shareViaEmail() {
    if (shareBusy) return;
    setShareBusy("email");
    try {
      const text = await shareText();
      window.open(`mailto:?subject=${encodeURIComponent("Project files")}&body=${encodeURIComponent(text)}`, "_self");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create share links.");
    } finally {
      setShareBusy(null);
    }
  }

  async function shareViaWhatsApp() {
    if (shareBusy) return;
    setShareBusy("whatsapp");
    setShareMessage("");
    try {
      if (await shareFiles(selectedShareFiles, "Project files")) return;
      setShareMessage("This browser cannot attach files to WhatsApp. Use the mobile app or a browser that supports file sharing.");
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "Could not prepare files for WhatsApp.");
    } finally {
      setShareBusy(null);
    }
  }

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
      <section ref={previewRef} className="min-h-0 min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white max-lg:order-2">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <h2 className="min-w-0 break-words text-sm font-semibold sm:text-base">{selected ? selected.fileName : `No ${label} uploaded`}</h2>
          {selected ? <a className="btn-outline h-9 w-full justify-center px-3 text-xs sm:h-8 sm:w-auto" href={`/api/v1/files/${selected.id}/download`}><Download size={14} /> Download</a> : null}
        </div>
        {selected ? <FilePreview id={selected.id} fileName={selected.fileName} mimeType={selected.mimeType} /> : <div className="flex h-[calc(100vh-16rem)] items-center justify-center text-sm text-slate-500">Upload the first file to preview it here.</div>}
      </section>
      <aside className="min-h-0 min-w-0 space-y-4 overflow-visible lg:overflow-auto max-lg:order-1">
        {canUpload && categoryKey ? <FileUploader label={`Upload new ${label}`} ownerType="Project" ownerId={projectId} visibility="TEAM" metadata={{ categoryKey }} onUploaded={() => router.refresh()} /> : null}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
            <div className="font-semibold">{canUpload ? "Previous files" : "Matching files"}</div>
            {files.length ? <button className="btn-outline h-9 px-3 text-xs sm:h-8 sm:px-2" type="button" onClick={() => { setShareMode((value) => !value); setShareIds(new Set()); }}>{shareMode ? <X size={13} /> : <Share2 size={13} />}{shareMode ? "Cancel" : "Share"}</button> : null}
          </div>
          {shareMode ? (
            <div className="space-y-2 border-b border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-600">WhatsApp shares selected files as attachments. Choose WhatsApp in the device share sheet.</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button className="btn-primary h-9 justify-center px-3 text-xs sm:h-8" type="button" disabled={!shareIds.size || Boolean(shareBusy)} onClick={() => void nativeShare()}><Share2 size={13} /> {shareBusy === "native" ? "Preparing" : "Share"}</button>
                <button className="btn-outline h-9 justify-center px-3 text-xs sm:h-8" type="button" disabled={!shareIds.size || Boolean(shareBusy)} onClick={() => void shareViaEmail()}><Mail size={13} /> {shareBusy === "email" ? "Preparing" : "Email"}</button>
                <button className="btn-outline h-9 justify-center px-3 text-xs sm:h-8" type="button" disabled={!shareIds.size || Boolean(shareBusy)} onClick={() => void shareViaWhatsApp()}><MessageCircle size={13} /> {shareBusy === "whatsapp" ? "Preparing" : "WhatsApp"}</button>
              </div>
              {shareMessage ? <p className="text-xs text-amber-700">{shareMessage}</p> : null}
            </div>
          ) : null}
          <div className="divide-y divide-slate-100">
            {files.map((file) => <div className={`p-3 ${selected?.id === file.id ? "bg-navy-100" : ""}`} key={file.id}>
              <div className="flex items-start gap-2">
                {shareMode ? <input className="mt-1 size-4" type="checkbox" checked={shareIds.has(file.id)} onChange={() => toggleShare(file.id)} aria-label={`Share ${file.fileName}`} /> : null}
                <button className="flex min-w-0 flex-1 items-start gap-2 text-left" type="button" onClick={() => selectFile(file.id)}><File className="mt-0.5 shrink-0" size={15} /><span className="min-w-0"><span className="block break-words text-sm font-medium sm:truncate">{file.fileName}</span>{file.categoryLabel ? <span className="block break-words text-xs text-slate-500 sm:truncate">{file.categoryLabel}</span> : null}<span className="block text-xs text-slate-500">Version {file.version ?? 1} · {file.uploadedByName ?? "System"}</span><span className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleString()}</span></span></button>
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
