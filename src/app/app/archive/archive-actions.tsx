"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RestoreButton({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function restore() {
    if (!window.confirm(`Restore ${label}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Restore failed.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-outline h-8 px-3 text-xs" type="button" disabled={busy} onClick={() => void restore()}>
      <RotateCcw size={13} />
      {busy ? "Restoring..." : "Restore"}
    </button>
  );
}
