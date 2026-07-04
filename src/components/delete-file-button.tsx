"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export function DeleteFileButton({ fileId, fileName }: { fileId: string; fileName?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!window.confirm(`Delete ${fileName ?? "this document"} from active document lists? It will remain in audit history.`)) return;
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Deleted from workspace UI" }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Delete failed");
      return;
    }
    router.refresh();
  }

  async function rename() {
    const nextName = window.prompt("Rename file", fileName ?? "")?.trim();
    if (!nextName || nextName === fileName) return;
    setLoading(true);
    const response = await fetch(`/api/v1/files/${fileId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: nextName }),
    });
    setLoading(false);
    if (!response.ok) setMessage((await response.json()).error ?? "Rename failed");
    else router.refresh();
  }

  return (
    <span className="inline-flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <button type="button" className="btn-outline h-9 flex-1 justify-center px-3 text-xs sm:h-8 sm:flex-none" onClick={() => void rename()} disabled={loading}>
        <Pencil size={14} /> Rename
      </button>
      <button type="button" className="btn-outline h-9 flex-1 justify-center px-3 text-xs text-rose-700 hover:bg-rose-50 sm:h-8 sm:flex-none" onClick={remove} disabled={loading}>
        <Trash2 size={14} />
        {loading ? "Deleting" : "Delete"}
      </button>
      {message ? <span className="text-xs text-rose-700">{message}</span> : null}
    </span>
  );
}
