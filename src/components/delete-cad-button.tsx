"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function DeleteCadButton({ cadFileId, fileName }: { cadFileId: string; fileName?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!window.confirm(`Are you sure you want to delete ${fileName ?? "this Map file"}? This action cannot be undone.`)) return;
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/cad/${cadFileId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Deleted from Map workspace UI" }),
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
