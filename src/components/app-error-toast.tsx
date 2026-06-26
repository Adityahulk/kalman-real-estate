"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type ErrorToast = {
  id: number;
  title: string;
  message: string;
  meta?: string;
};

type ApiErrorDetail = {
  message?: string;
  endpoint?: string;
  status?: number;
};

declare global {
  interface Window {
    __widestateFetchPatched?: boolean;
  }
}

function endpointLabel(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isAppApiRequest(input: RequestInfo | URL) {
  return endpointLabel(input).includes("/api/");
}

async function responseErrorMessage(response: Response) {
  try {
    const body = await response.clone().json();
    if (typeof body?.error === "string") return body.error;
    if (Array.isArray(body?.issues) && body.issues[0]?.message) return body.issues[0].message;
  } catch {
    // Fall back to HTTP status below.
  }
  return `Request failed with HTTP ${response.status}`;
}

export function AppErrorToast() {
  const [toast, setToast] = useState<ErrorToast | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    function show(title: string, message: string, meta?: string) {
      const id = nextId.current++;
      setToast({ id, title, message, meta });
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 9000);
    }

    function onApiError(event: Event) {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail ?? {};
      const status = detail.status ? `HTTP ${detail.status}` : undefined;
      const endpoint = detail.endpoint ? detail.endpoint.replace(window.location.origin, "") : undefined;
      show("Request failed", detail.message || "Something went wrong while talking to the server.", [status, endpoint].filter(Boolean).join(" · "));
    }

    function onError(event: ErrorEvent) {
      show("Unexpected error", event.message || "Something went wrong on this page.", event.filename ? `${event.filename}:${event.lineno}` : undefined);
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Something went wrong while completing this action.";
      show("Unexpected error", message);
    }

    if (!window.__widestateFetchPatched) {
      window.__widestateFetchPatched = true;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        try {
          const response = await originalFetch(input, init);
          if (!response.ok && isAppApiRequest(input)) {
            const message = await responseErrorMessage(response);
            console.error("[widestate:api-error]", { endpoint: endpointLabel(input), status: response.status, message });
            window.dispatchEvent(new CustomEvent<ApiErrorDetail>("widestate:api-error", {
              detail: { message, endpoint: endpointLabel(input), status: response.status },
            }));
          }
          return response;
        } catch (error) {
          if (isAppApiRequest(input)) {
            const message = "Could not connect to the server. Please try again.";
            console.error("[widestate:api-network-error]", { endpoint: endpointLabel(input), error });
            window.dispatchEvent(new CustomEvent<ApiErrorDetail>("widestate:api-error", {
              detail: { message, endpoint: endpointLabel(input), status: 0 },
            }));
          }
          throw error;
        }
      };
    }

    window.addEventListener("widestate:api-error", onApiError);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("widestate:api-error", onApiError);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[9999] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-red-200 bg-white p-4 text-slate-900 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-red-50 p-2 text-red-600">
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{toast.title}</div>
          <div className="mt-1 text-sm leading-5 text-slate-700">{toast.message}</div>
          {toast.meta ? <div className="mt-2 break-all text-xs text-slate-500">{toast.meta}</div> : null}
        </div>
        <button type="button" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setToast(null)} aria-label="Close error message">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
