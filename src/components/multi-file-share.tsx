"use client";

import { useState } from "react";
import { Check, Link2, Mail, MessageCircle, Share2, X } from "lucide-react";
import { createFileBundleShareLinks, formatFileBundleShareMessage, openWhatsAppWithLink } from "@/lib/file-sharing";

type ShareFile = { id: string; fileName: string };

export function MultiFileShare({ files }: { files: ShareFile[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"whatsapp" | "email" | "copy" | null>(null);
  const [message, setMessage] = useState("");

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected((current) => (current.size === files.length ? new Set() : new Set(files.map((file) => file.id))));
  }

  async function share(target: "whatsapp" | "email" | "copy") {
    const chosen = files.filter((file) => selected.has(file.id));
    if (!chosen.length) return;
    setBusy(target);
    setMessage("");
    try {
      const links = await createFileBundleShareLinks(chosen);
      const shareMessage = formatFileBundleShareMessage(links, chosen.length);
      if (target === "whatsapp") {
        openWhatsAppWithLink(shareMessage);
      } else if (target === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent("Shared files")}&body=${encodeURIComponent(shareMessage)}`;
      } else {
        if (!navigator.clipboard) throw new Error("Clipboard access is not available in this browser.");
        await navigator.clipboard.writeText(shareMessage);
        window.alert(`${links.length} secure link${links.length === 1 ? "" : "s"} copied.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare files for sharing.");
    } finally {
      setBusy(null);
    }
  }

  if (!files.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="text-sm font-medium text-slate-700">Share files</div>
        <button
          type="button"
          className="btn-outline h-8 px-3 text-xs"
          onClick={() => { setOpen((value) => !value); setSelected(new Set()); }}
        >
          {open ? <X size={13} /> : <Share2 size={13} />}
          {open ? "Cancel" : "Select & share"}
        </button>
      </div>
      {open ? (
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">Files are shared in secure groups of 10. Larger selections are split into multiple short links automatically.</div>
            <button type="button" className="text-xs font-medium text-navy-700 hover:text-navy-900" onClick={selectAll}>
              {selected.size === files.length ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-auto rounded-md border border-slate-100 p-1">
            {files.map((file) => (
              <label key={file.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-50">
                <input type="checkbox" className="size-4" checked={selected.has(file.id)} onChange={() => toggle(file.id)} />
                <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
                {selected.has(file.id) ? <Check size={13} className="shrink-0 text-emerald-600" /> : null}
              </label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" className="btn-primary h-9 justify-center px-3 text-xs sm:h-8" disabled={!selected.size || Boolean(busy)} onClick={() => void share("whatsapp")}>
              <MessageCircle size={13} />
              {busy === "whatsapp" ? "Preparing" : "WhatsApp"}
            </button>
            <button type="button" className="btn-outline h-9 justify-center px-3 text-xs sm:h-8" disabled={!selected.size || Boolean(busy)} onClick={() => void share("email")}>
              <Mail size={13} />
              {busy === "email" ? "Preparing" : "Email"}
            </button>
            <button type="button" className="btn-outline h-9 justify-center px-3 text-xs sm:h-8" disabled={!selected.size || Boolean(busy)} onClick={() => void share("copy")}>
              <Link2 size={13} />
              {busy === "copy" ? "Preparing" : "Copy link"}
            </button>
          </div>
          {message ? <p className="text-xs text-amber-700">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
