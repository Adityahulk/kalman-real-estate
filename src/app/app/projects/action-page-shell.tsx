import Link from "next/link";
import type React from "react";
import { ArrowLeft } from "lucide-react";

export function ActionPageShell({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  children,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-navy-900" href={backHref}>
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
        <div className="border-b border-slate-200 pb-6">
          {eyebrow ? <div className="text-sm font-medium text-gold-700">{eyebrow}</div> : null}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        <section className={aside ? "mt-6 grid gap-6 lg:grid-cols-[1fr_340px]" : "mt-6"}>
          <div>{children}</div>
          {aside ? <aside className="space-y-4">{aside}</aside> : null}
        </section>
      </div>
    </main>
  );
}

export function ActionHint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{children}</div>
    </div>
  );
}
