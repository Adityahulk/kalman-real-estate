"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { registerForPush, storeSessionToken } from "@/lib/native";

const REMEMBERED_IDENTIFIER_KEY = "widestate-remembered-login";

async function storeBrowserCredential(identifier: string, password: string) {
  if (!globalThis.window?.isSecureContext || !navigator.credentials?.store) return;
  const PasswordCredentialConstructor = (
    globalThis.window as Window & {
      PasswordCredential?: new (data: { id: string; name: string; password: string }) => Credential;
    }
  ).PasswordCredential;
  if (!PasswordCredentialConstructor) return;

  try {
    await navigator.credentials.store(
      new PasswordCredentialConstructor({ id: identifier, name: identifier, password }),
    );
  } catch {
    // Password managers may decline storage. The normal browser autofill flow remains available.
  }
}

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const rememberedIdentifier = globalThis.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
      if (rememberedIdentifier) {
        setIdentifier(rememberedIdentifier);
        setRememberMe(true);
      }
    } catch {
      // Storage may be disabled by browser privacy settings; login still works normally.
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
    const payload = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Login failed");
      return;
    }

    // Native shell: mirror the JWT into secure storage for bearer auth + relaunch persistence,
    // and register for push. Both are no-ops on the web build.
    await storeSessionToken(payload?.data?.token);
    void registerForPush();

    try {
      if (rememberMe) {
        globalThis.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier.trim());
        await storeBrowserCredential(identifier.trim(), password);
      } else {
        globalThis.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      }
    } catch {
      // Remember-me storage is optional and must never prevent a successful login.
    }

    router.push(search.get("next") ?? "/firms");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3 text-navy-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-navy-200 bg-navy-100 text-navy-900">
            <Building2 size={20} />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide">WIDESTATE OS</span>
        </Link>

        <form autoComplete="on" onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
            <h1 className="text-center text-2xl font-semibold text-navy-950">Sign in</h1>
            <p className="mt-2 text-center text-sm text-slate-500">Access your property workspace.</p>

            <label className="mt-6 block">
              <span className="label">Email or User ID</span>
              <span className="relative block">
                <UserRound className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
                <input
                  id="username"
                  name="username"
                  className="input pl-10"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </span>
            </label>

            <label className="mt-4 block">
              <span className="label">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
                <input
                  className="input pl-10"
                  id="current-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </span>
            </label>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                className="h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-700"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me on this device
            </label>

            {error ? <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

            <button className="btn-primary mt-6 w-full" disabled={loading || !identifier || !password}>
              {loading ? <Loader2 className="animate-spin" size={17} /> : null}
              Sign in
            </button>
        </form>
        <Link className="mt-5 block text-center text-sm text-slate-500 hover:text-navy-900" href="/">Back to home</Link>
      </section>
    </main>
  );
}
