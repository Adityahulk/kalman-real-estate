"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function AiInsightActions({ insightId, approved }: { insightId: string; approved: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    await fetch(`/api/v1/ai/insights/${insightId}/approve`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  if (approved) return <span className="chip bg-emerald-50 text-emerald-700">Approved</span>;

  return (
    <button className="btn-outline h-8 px-3 text-xs" onClick={approve} disabled={loading}>
      <CheckCircle2 size={14} />
      Approve
    </button>
  );
}
