"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[widestate:route-error]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="card max-w-lg p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">The error has been logged. Try the action again.</p>
        <button className="btn-primary mt-5" onClick={reset} type="button">Try again</button>
      </div>
    </main>
  );
}
