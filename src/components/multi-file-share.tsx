"use client";

import { useState } from "react";
import { Check, Link2, Mail, MessageCircle, Share2, X } from "lucide-react";

type ShareFile = { id: string; fileName: string };

// Builds ONE short public link that lists every selected file, instead of pasting one long signed
// URL per file (which overflows WhatsApp's text limit and stops the links being clickable).
async function createBundleUrl(fileIds: string[]) {
  const response = await fetch("/api/v1/files/share-bundle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileIds }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data?.url) throw new Error(body?.error ?? "Could not create share link.");
  return body.data.url as string;
}

function whatsAppShareUrl(text: string) {
  const encoded = encodeURIComponent(text);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return isMobile ? `whatsapp://send?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
}

export function MultiFileShare({ files }: { files: ShareFile[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"whatsapp" | "email" | "copy" | null>(null);

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
    const ids = files.filter((file) => selected.has(file.id)).map((file) => file.id);
    if (!ids.length) return;
    setBusy(target);
    try {
      const url = await createBundleUrl(ids);
      const message = `${ids.length} file${ids.length === 1 ? "" : "s"} shared with you:\n${url}`;
      if (target === "whatsapp") {
        window.location.href = whatsAppShareUrl(message);
      } else if (target === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent("Shared files")}&body=${encodeURIComponent(message)}`;
      } else {
        await navigator.clipboard?.writeText(url);
        window.alert("Share link copied.");
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create share link.");
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
            <div className="text-xs text-slate-500">Select files, then send one link.</div>
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
        </div>
      ) : null}
    </div>
  );
}
