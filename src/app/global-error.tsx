"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[widestate:global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
          <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-xl font-semibold">WIDESTATE OS could not load</h1>
            <p className="mt-2 text-sm text-slate-600">The error has been logged. Please retry.</p>
            <button className="mt-5 rounded-lg bg-[#2D5986] px-4 py-2 text-sm font-medium text-white" onClick={reset} type="button">Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
