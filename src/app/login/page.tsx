"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, LockKeyhole, Mail } from "lucide-react";

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
  const [email, setEmail] = useState("owner@saldhaland.example");
  const [password, setPassword] = useState("Kalman@12345");
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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col justify-between px-6 py-10 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-shine text-navy-950">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-gold-300">Kalman Estate OS</div>
              <div className="text-xs text-slate-400">Production workspace</div>
            </div>
          </div>

          <div className="max-w-2xl py-16">
            <h1 className="font-display text-5xl font-semibold leading-tight text-white">
              One operating system for builder ownership, CAD, progress, cost, and delivery.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Sign in to manage projects, recursive CAD visualizations, plot ownership, site execution,
              owner progress, marketing approvals, BOQ variance, and AI reports from one tenant-safe system.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="border-t border-white/10 pt-3">Tenant isolation</div>
            <div className="border-t border-white/10 pt-3">Role based permissions</div>
            <div className="border-t border-white/10 pt-3">Audit history on every mutation</div>
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
                <input className="input pl-10" value={email} onChange={(event) => setEmail(event.target.value)} />
              </span>
            </label>

            <label className="mt-4 block">
              <span className="label">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
                <input
                  className="input pl-10"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </span>
            </label>

            {error ? <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

            <button className="btn-primary mt-6 w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={17} /> : null}
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
