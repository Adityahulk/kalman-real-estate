"use client";

import { Loader2, MessageSquareText, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { CadModeHeader } from "../cad-mode-header";

type StudioState = {
  selectedHandles?: string[];
  hiddenLayers?: string[];
  activeLayout?: string | null;
};

type StudioEvent = {
  type: string;
  state?: StudioState;
  message?: string;
  handles?: string[];
};

type StudioOverlay = {
  id: string;
  kind: string;
  label: string | null;
  sourceHandle: string | null;
  metadata: unknown;
  updatedAt: string;
};

export function CadStudio({
  cadFile,
  initialState,
  initialOverlays,
  hasScene,
  headerActions,
}: {
  cadFile: {
    id: string;
    originalName: string;
    version: number;
    status: string;
    projectId: string | null;
    format: string;
  };
  initialState: StudioState | null;
  initialOverlays: StudioOverlay[];
  hasScene: boolean;
  headerActions?: ReactNode;
}) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const source = useRef<{ bytes: ArrayBuffer; checksum: string } | null>(null);
  const state = useRef<StudioState>(initialState ?? {});
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(hasScene ? "Drawing ready" : "Preparing drawing extraction");
  const [error, setError] = useState("");
  const [selectedHandles, setSelectedHandles] = useState<string[]>(initialState?.selectedHandles ?? []);
  const [overlays, setOverlays] = useState(initialOverlays);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [overlaySaving, setOverlaySaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSource() {
      try {
        const response = await fetch(`/api/v1/cad/${cadFile.id}/source`, { cache: "no-store" });
        if (!response.ok) throw new Error(await responseMessage(response, "Could not load the original CAD file."));
        const bytes = await response.arrayBuffer();
        const checksum = response.headers.get("x-cad-source-sha256");
        if (!checksum) throw new Error("The drawing checksum is unavailable.");
        if (!active) return;
        source.current = { bytes, checksum };
        openDrawing();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not open CAD Studio.");
      }
    }
    function onMessage(event: MessageEvent<StudioEvent>) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data.type === "kalman:studio-mounted") openDrawing();
      if (event.data.type === "kalman:studio-shell-ready") {
        setReady(true);
        setNotice("Opening drawing");
      }
      if (event.data.type === "kalman:studio-ready") {
        setReady(true);
        setNotice("Drawing ready");
        if (initialState) sendCommand("restore", initialState);
      }
      if (event.data.type === "kalman:studio-state" && event.data.state) {
        state.current = event.data.state;
        setSelectedHandles(event.data.state.selectedHandles ?? []);
        window.sessionStorage.setItem(sessionKey(cadFile.id), JSON.stringify(event.data.state));
      }
      if (event.data.type === "kalman:studio-selection") setSelectedHandles(event.data.handles ?? []);
      if (event.data.type === "kalman:studio-extraction-progress") setNotice(event.data.message ?? "Preparing review records");
      if (event.data.type === "kalman:studio-extraction-complete") {
        setNotice("Review records are ready");
        router.refresh();
      }
      if (event.data.type === "kalman:studio-extraction-error") setError(event.data.message ?? "Drawing extraction failed.");
    }
    window.addEventListener("message", onMessage);
    void loadSource();
    return () => {
      active = false;
      window.removeEventListener("message", onMessage);
    };
  // The drawing is immutable for the lifetime of this route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadFile.id]);

  function openDrawing() {
    if (!source.current || !frame.current?.contentWindow) return;
    const bytes = source.current.bytes.slice(0);
    frame.current.contentWindow.postMessage({
      type: "kalman:studio-open",
      bytes,
      fileName: cadFile.originalName,
      cadFileId: cadFile.id,
      sourceSha256: source.current.checksum,
      autoExtract: !hasScene,
    }, window.location.origin, [bytes]);
  }

  function sendCommand(command: string, payload?: unknown) {
    frame.current?.contentWindow?.postMessage({
      type: "kalman:studio-command",
      command,
      payload,
    }, window.location.origin);
  }

  async function saveState() {
    setSaving(true);
    setError("");
    sendCommand("get-state");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    const response = await fetch(`/api/v1/cad/${cadFile.id}/overlays`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "VIEW_STATE",
        label: "CAD Studio workspace",
        metadata: state.current,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setError(await responseMessage(response, "Could not save the CAD workspace."));
      return;
    }
    setNotice("Workspace saved");
  }

  async function saveOverlay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setOverlaySaving(true);
    setError("");
    const response = await fetch(`/api/v1/cad/${cadFile.id}/overlays`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: String(form.get("kind") ?? "NOTE"),
        label: String(form.get("label") ?? "").trim(),
        sourceHandle: selectedHandles[0],
        metadata: { detail: String(form.get("detail") ?? "").trim() },
      }),
    });
    const body = await response.json().catch(() => null);
    setOverlaySaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Could not save the CAD overlay.");
      return;
    }
    setOverlays((current) => [body.data, ...current]);
    event.currentTarget.reset();
    setNotice("Overlay saved");
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#10151c]">
      <CadModeHeader
        cadFileId={cadFile.id}
        drawingName={cadFile.originalName}
        version={cadFile.version}
        status={cadFile.status}
        projectId={cadFile.projectId}
        activeMode="studio"
        format={cadFile.format}
        actions={(
          <div className="hidden items-center gap-2 sm:flex">
            <button className="btn-outline h-9 px-3" onClick={() => setOverlaysOpen(true)}>
              <MessageSquareText size={15} />
              Overlays
            </button>
            <button className="btn-outline h-9 px-3" onClick={saveState} disabled={!ready || saving}>
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              Save workspace
            </button>
            {headerActions}
          </div>
        )}
      />
      <div className="relative min-h-0 flex-1">
        <iframe
          ref={frame}
          className="h-full w-full border-0"
          src="/cad-runtime/studio.html"
          title={`CAD Studio: ${cadFile.originalName}`}
          allow="fullscreen"
        />
        {!ready && !error ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/80 text-white">
            <div className="text-center"><Loader2 className="mx-auto animate-spin" /><div className="mt-3 text-sm">{notice}</div></div>
          </div>
        ) : null}
        <div className={`absolute bottom-3 left-1/2 z-10 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md px-3 py-2 text-xs shadow-lg ${error ? "bg-rose-600 text-white" : "bg-slate-950/85 text-slate-100"}`}>
          {error || notice}
        </div>
      </div>
      {overlaysOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onMouseDown={() => setOverlaysOpen(false)}>
          <aside className="flex h-full w-full max-w-sm flex-col bg-white text-navy-950 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <div>
                <h2 className="font-semibold">Drawing overlays</h2>
                <p className="text-xs text-slate-500">{selectedHandles[0] ? `Selected handle ${selectedHandles[0]}` : "Select an entity to attach context"}</p>
              </div>
              <button className="btn-ghost h-9 w-9 px-0" onClick={() => setOverlaysOpen(false)}><X size={17} /></button>
            </div>
            <form className="shrink-0 space-y-3 border-b border-slate-200 p-4" onSubmit={saveOverlay}>
              <label className="block"><span className="label">Overlay type</span><select className="input" name="kind" defaultValue="NOTE"><option value="NOTE">Technical note</option><option value="ANNOTATION">Annotation</option><option value="MEASUREMENT">Saved measurement</option></select></label>
              <label className="block"><span className="label">Title</span><input className="input" name="label" required maxLength={240} placeholder="e.g. Verify road width" /></label>
              <label className="block"><span className="label">Details</span><textarea className="input min-h-24 resize-y py-2" name="detail" placeholder="Add the measurement, observation, or review context." /></label>
              <button className="btn-primary w-full justify-center" disabled={overlaySaving}>{overlaySaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save overlay</button>
            </form>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {overlays.map((overlay) => {
                const detail = overlay.metadata && typeof overlay.metadata === "object" && !Array.isArray(overlay.metadata)
                  ? String((overlay.metadata as Record<string, unknown>).detail ?? "")
                  : "";
                return (
                  <article key={overlay.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{overlay.kind.replaceAll("_", " ")}</span><span className="text-[11px] text-slate-400">{new Date(overlay.updatedAt).toLocaleDateString()}</span></div>
                    <div className="mt-1 text-sm font-medium">{overlay.label || "Untitled overlay"}</div>
                    {detail ? <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p> : null}
                    {overlay.sourceHandle ? <div className="mt-2 text-[11px] text-slate-400">CAD handle {overlay.sourceHandle}</div> : null}
                  </article>
                );
              })}
              {!overlays.length ? <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No saved annotations or measurements yet.</div> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function sessionKey(cadFileId: string) {
  return `kalman-cad-studio:${cadFileId}`;
}

async function responseMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}
