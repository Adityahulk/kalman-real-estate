"use client";

import { useEffect } from "react";

export function ClientErrorLogger() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      console.error("[widestate:uncaught-error]", {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error,
      });
    }
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      console.error("[widestate:unhandled-rejection]", event.reason);
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
