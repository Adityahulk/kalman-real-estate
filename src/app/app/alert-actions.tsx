"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AlertActions({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function decide(status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    setLoading(status);
    setMessage("");
    const response = await fetch(`/api/v1/approvals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note: note || undefined }),
    });
    const body = await response.json();
    setLoading("");
    if (!response.ok) {
      setMessage(body.error ?? "Could not update alert");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn-primary h-8 px-3 text-xs" onClick={() => decide("APPROVED")} disabled={Boolean(loading)}>
          {loading === "APPROVED" ? <Loader2 className="animate-spin" size={13} /> : null} Approve
        </button>
        <button className="btn-outline h-8 px-3 text-xs text-rose-700" onClick={() => decide("REJECTED")} disabled={Boolean(loading)}>Reject</button>
        <button className="btn-outline h-8 px-3 text-xs" onClick={() => decide("CHANGES_REQUESTED")} disabled={Boolean(loading)}>Hold</button>
      </div>
      {message ? <div className="mt-2 text-xs text-rose-700">{message}</div> : null}
    </div>
  );
}
