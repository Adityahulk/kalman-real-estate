"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/app", label = "Back" }: { fallbackHref?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost h-9 px-0 text-slate-600 hover:text-navy-900"
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
