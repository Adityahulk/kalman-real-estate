"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-outline h-8 px-3 text-xs text-rose-700 hover:bg-rose-50" onClick={remove} disabled={loading}>
        <Trash2 size={14} />
        {loading ? "Deleting" : "Delete"}
      </button>
      {message ? <span className="text-xs text-rose-700">{message}</span> : null}
    </span>
  );
}
