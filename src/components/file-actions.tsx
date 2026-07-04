"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FileActions({ fileId, fileName, allowDelete = true }: { fileId: string; fileName: string; allowDelete?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function rename() {
    const nextName = window.prompt("Rename file", fileName)?.trim();
    if (!nextName || nextName === fileName) return;
    setLoading(true);
    const response = await fetch(`/api/v1/files/${fileId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: nextName }),
    });
    setLoading(false);
    if (!response.ok) window.alert((await response.json()).error ?? "Rename failed");
    else router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete ${fileName} from active lists?`)) return;
    setLoading(true);
    const response = await fetch(`/api/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Deleted from workspace UI" }),
    });
    setLoading(false);
    if (!response.ok) window.alert((await response.json()).error ?? "Delete failed");
    else router.refresh();
  }

  return <span className="inline-flex flex-wrap gap-1">
    <button className="btn-ghost h-8 px-2 text-xs" type="button" onClick={() => void rename()} disabled={loading}><Pencil size={13} /> Rename</button>
    {allowDelete ? <button className="btn-ghost h-8 px-2 text-xs text-rose-700" type="button" onClick={() => void remove()} disabled={loading}><Trash2 size={13} /> Delete</button> : null}
  </span>;
}
