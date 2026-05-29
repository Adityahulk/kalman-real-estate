"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, FileText, GitBranch, Loader2, LockKeyhole, Mail, Map, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Login failed");
      return;
    }

    router.push(search.get("next") ?? "/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-navy-950 text-white">
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>
      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[0.9fr_420px]">
        <section className="flex flex-col justify-between px-6 py-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-shine text-navy-950">
              <Building2 size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide text-gold-300">Kalman Estate OS</span>
              <span className="block text-xs text-slate-400">Builder operating system</span>
            </span>
          </Link>

          <div className="max-w-2xl py-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-gold-200">
              <ShieldCheck size={14} />
              Secure workspace access
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Sign in to your builder command center.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Access CAD visualizations, plot ownership, document vaults, site progress, marketing approvals, cost control, and AI reports.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              {[
                [Map, "CAD maps", "DXF site and plot visualizations"],
                [FileText, "Documents", "Allotment, registry, PAN, Aadhaar"],
                [GitBranch, "Audit trail", "Ownership and transfer history"],
                [ShieldCheck, "Tenant safe", "Role-based owner visibility"],
              ].map(([Icon, title, copy]) => (
                <div key={String(title)} className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
                  <Icon className="text-gold-300" size={17} />
                  <div className="mt-2 text-sm font-semibold">{String(title)}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{String(copy)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <Link className="hover:text-white" href="/">Back to platform overview</Link>
            <span>Role-based access</span>
            <span>Owner-safe downloads</span>
          </div>
        </section>

        <section className="flex items-center px-6 py-10">
          <form onSubmit={submit} className="w-full rounded-lg border border-white/10 bg-white p-6 text-navy-950 shadow-2xl">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use your builder workspace credentials.</p>

            <label className="mt-6 block">
              <span className="label">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
                <input className="input pl-10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </span>
            </label>

            <label className="mt-4 block">
              <span className="label">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
                <input
                  className="input pl-10"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </span>
            </label>

            {error ? <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

            <button className="btn-primary mt-6 w-full" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="animate-spin" size={17} /> : null}
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
