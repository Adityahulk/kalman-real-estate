"use client";

import {
  BoxSelect,
  Hand,
  Layers3,
  Loader2,
  Maximize2,
  Moon,
  Ruler,
  ScanSearch,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { extractMlightCadDatabase, type BrowserCadExtraction } from "./mlightcad-extractor";

type Mode = "select" | "pan";
type RuntimeManager = {
  curDocument: { database: Parameters<typeof extractMlightCadDatabase>[0] };
  curView: {
    mode: number;
    curPos: { x: number; y: number };
    zoomToFitDrawing(timeout?: number): void;
    updateLayer(layer: never, changes: { isOff: boolean }): void;
    selectionSet: {
      count: number;
      has(id: string): boolean;
      add(id: string): void;
      clear(): void;
      events: {
        selectionAdded: {
          addEventListener(listener: (args: { ids: string[] }) => void): void;
          removeEventListener(listener: (args: { ids: string[] }) => void): void;
        };
      };
    };
  };
  openDocument(fileName: string, bytes: ArrayBuffer, options: { mode: number }): Promise<boolean>;
  sendStringToExecute(command: string): void;
  destroy(): Promise<void>;
};
type MlightRuntime = {
  AcEdOpenMode: { Review: number };
  AcEdViewMode: { SELECTION: number; PAN: number };
  AcApDocManager: {
    createInstance(options: Record<string, unknown>): RuntimeManager | undefined;
  };
};
let previousViewerTeardown: Promise<void> = Promise.resolve();

export function MlightCadMap({
  cadFileId,
  fileName,
  autoExtract,
  hiddenLayerNames,
  selectedSourceHandle,
  onSelectSourceHandle,
  onCalibrationPoints,
  onExtractionComplete,
}: {
  cadFileId: string;
  fileName: string;
  autoExtract: boolean;
  hiddenLayerNames: Set<string>;
  selectedSourceHandle?: string | null;
  onSelectSourceHandle?: (sourceHandle: string) => void;
  onCalibrationPoints?: (points: Array<[number, number]>) => void;
  onExtractionComplete?: () => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const manager = useRef<RuntimeManager | null>(null);
  const runtime = useRef<MlightRuntime | null>(null);
  const calibrationCallback = useRef(onCalibrationPoints);
  const calibrationPoints = useRef<Array<[number, number]>>([]);
  const layers = useRef(new Map<string, { isOff: boolean } & Record<string, unknown>>());
  const [mode, setMode] = useState<Mode>("select");
  const [dark, setDark] = useState(true);
  const [state, setState] = useState<"loading" | "extracting" | "ready" | "failed">("loading");
  const [progress, setProgress] = useState("Loading browser CAD engine");
  const [error, setError] = useState("");
  calibrationCallback.current = onCalibrationPoints;

  useEffect(() => {
    if (!container.current) return;
    let active = true;
    let selectionListener: ((args: { ids: string[] }) => void) | null = null;

    async function openDrawing() {
      try {
        setState("loading");
        setError("");
        setProgress("Downloading the original drawing");
        const response = await fetch(`/api/v1/cad/${cadFileId}/source`, { cache: "no-store" });
        if (!response.ok) throw new Error(await responseError(response, "Could not load the original CAD file."));
        const bytes = await response.arrayBuffer();
        const checksum = await resolveSourceChecksum(bytes, response.headers.get("x-cad-source-sha256"));

        setProgress("Opening drawing securely in your browser");
        await previousViewerTeardown;
        const runtimeUrl = "/cad-runtime/mlightcad-runtime.js";
        const viewer = await import(/* webpackIgnore: true */ runtimeUrl) as MlightRuntime;
        runtime.current = viewer;
        const created = viewer.AcApDocManager.createInstance({
          container: container.current!,
          autoResize: true,
          // The library default omits the trailing slash, producing broken URLs like
          // "cad-datafonts/fonts.json". Explicitly pass the CDN URL with a trailing
          // slash so fonts resolve to "cad-data/fonts/fonts.json".
          baseUrl: "https://cdn.jsdelivr.net/gh/mlightcad/cad-data/",
          useMainThreadDraw: true,
          webworkerFileUrls: {
            dxfParser: "/cad-runtime/dxf-parser-worker.js",
            dwgParser: "/cad-runtime/libredwg-parser-worker.js",
            mtextRender: "/cad-runtime/mtext-renderer-worker.js",
          },
        });
        if (!created) throw new Error("The CAD viewer could not start.");
        manager.current = created;
        const opened = await created.openDocument(fileName, bytes, { mode: viewer.AcEdOpenMode.Review });
        if (!opened) throw new Error(dwgFriendlyError(fileName, "The drawing could not be opened."));
        if (!active) return;

        const database = created.curDocument.database;
        layers.current = new Map(Array.from(database.tables.layerTable.newIterator()).map((layer) => [
          layer.name,
          layer as unknown as { isOff: boolean } & Record<string, unknown>,
        ]));
        created.curView.mode = viewer.AcEdViewMode.SELECTION;
        created.curView.zoomToFitDrawing(0);
        selectionListener = (args) => {
          const sourceHandle = args.ids.at(-1);
          if (sourceHandle) onSelectSourceHandle?.(String(sourceHandle));
        };
        created.curView.selectionSet.events.selectionAdded.addEventListener(selectionListener);

        if (autoExtract) {
          setState("extracting");
          setProgress("Detecting layers, boundaries, labels, blocks, and utilities");
          const extraction = extractMlightCadDatabase(database);
          await uploadExtraction(cadFileId, checksum, extraction, setProgress);
          if (!active) return;
          onExtractionComplete?.();
        }
        setState("ready");
        setProgress("Drawing ready");
      } catch (reason) {
        if (!active) return;
        setState("failed");
        setError(dwgFriendlyError(fileName, reason instanceof Error ? reason.message : "The drawing could not be opened."));
      }
    }

    void openDrawing();
    return () => {
      active = false;
      const current = manager.current;
      if (selectionListener && current) {
        current.curView.selectionSet.events.selectionAdded.removeEventListener(selectionListener);
      }
      manager.current = null;
      if (current) previousViewerTeardown = current.destroy().catch(() => undefined);
    };
  // MLightCAD owns one document manager per mounted workspace.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadFileId, fileName]);

  useEffect(() => {
    const current = manager.current;
    if (!current) return;
    for (const [name, layer] of layers.current) {
      const shouldHide = hiddenLayerNames.has(name);
      if (Boolean(layer.isOff) !== shouldHide) {
        current.curView.updateLayer(layer as never, { isOff: shouldHide });
        layer.isOff = shouldHide;
      }
    }
  }, [hiddenLayerNames]);

  useEffect(() => {
    const current = manager.current;
    if (!current || !selectedSourceHandle || selectedSourceHandle.startsWith("joined:")) return;
    const selection = current.curView.selectionSet;
    if (selection.count === 1 && selection.has(selectedSourceHandle)) return;
    selection.clear();
    selection.add(selectedSourceHandle);
  }, [selectedSourceHandle]);

  useEffect(() => {
    const element = container.current;
    if (!element || !onCalibrationPoints) return;
    const capturePoint = () => {
      const point = manager.current?.curView.curPos;
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      calibrationPoints.current = [...calibrationPoints.current.slice(-1), [point.x, point.y]];
      calibrationCallback.current?.([...calibrationPoints.current]);
    };
    element.addEventListener("dblclick", capturePoint);
    return () => element.removeEventListener("dblclick", capturePoint);
  }, [onCalibrationPoints]);

  function changeMode(next: Mode) {
    const current = manager.current;
    if (!current) return;
    const viewer = runtime.current;
    if (!viewer) return;
    current.curView.mode = next === "pan" ? viewer.AcEdViewMode.PAN : viewer.AcEdViewMode.SELECTION;
    setMode(next);
  }

  function command(value: string) {
    manager.current?.sendStringToExecute(value);
  }

  return (
    <div className={`relative h-full min-h-[620px] overflow-hidden ${dark ? "bg-[#15191f]" : "bg-white"}`}>
      <div ref={container} className="absolute inset-0" />
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
        <ToolButton active={mode === "select"} label="Select" onClick={() => changeMode("select")} icon={<BoxSelect size={16} />} />
        <ToolButton active={mode === "pan"} label="Pan" onClick={() => changeMode("pan")} icon={<Hand size={16} />} />
        <ToolButton label="Fit drawing" onClick={() => manager.current?.curView.zoomToFitDrawing()} icon={<Maximize2 size={16} />} />
        <ToolButton label="Zoom window" onClick={() => command("zoom")} icon={<ScanSearch size={16} />} />
        <ToolButton label="Measure distance" onClick={() => command("measuredistance")} icon={<Ruler size={16} />} />
        <ToolButton label="Measure area" onClick={() => command("measurearea")} icon={<Layers3 size={16} />} />
        <ToolButton label={dark ? "Light background" : "Dark background"} onClick={() => { command("switchbg"); setDark((value) => !value); }} icon={dark ? <Sun size={16} /> : <Moon size={16} />} />
      </div>

      {state !== "ready" ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-6 text-white backdrop-blur-sm">
          <div className="max-w-lg text-center">
            {state === "failed" ? <ScanSearch className="mx-auto" size={28} /> : <Loader2 className="mx-auto animate-spin" size={28} />}
            <h3 className="mt-4 font-semibold">{state === "failed" ? "Drawing could not be opened" : progress}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {state === "failed" ? error : "The drawing is parsed locally in this browser. Keep this page open until review candidates are prepared."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-white/15 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
        Wheel zooms around the cursor · Drag in Pan mode · {onCalibrationPoints ? "Double-click two measurement endpoints" : "Click an entity to inspect it"}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-md ${active ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

async function uploadExtraction(
  cadFileId: string,
  sourceSha256: string,
  extraction: BrowserCadExtraction,
  setProgress: (value: string) => void,
) {
  if (!extraction.entities.length) {
    throw new Error("The drawing opened, but no closed business boundaries or recognized site assets were found. Check the CAD layers or export the drawing as a flattened DXF.");
  }
  const chunkSize = 500;
  const chunks = Array.from(
    { length: Math.max(1, Math.ceil(extraction.entities.length / chunkSize)) },
    (_, index) => extraction.entities.slice(index * chunkSize, (index + 1) * chunkSize),
  );
  const createResponse = await fetch(`/api/v1/cad/${cadFileId}/extractions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      parserEngine: "mlightcad-browser",
      parserVersion: "1.5.5",
      sourceSha256,
      drawingUnits: extraction.drawingUnits,
      bounds: extraction.bounds,
      expectedEntityCount: extraction.entities.length,
      expectedChunkCount: chunks.length,
      layers: extraction.layers,
      metadata: extraction.metadata,
    }),
  });
  if (!createResponse.ok) throw new Error(await responseError(createResponse, "Could not start browser extraction."));
  const created = await createResponse.json();
  const runId = created.data.id as string;

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      setProgress(`Validating drawing data ${index + 1} of ${chunks.length}`);
      const response = await fetch(`/api/v1/cad/${cadFileId}/extractions/${runId}/chunks/${index}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entities: chunks[index] }),
      });
      if (!response.ok) throw new Error(await responseError(response, `Could not upload extraction part ${index + 1}.`));
    }

    setProgress("Building the review scene");
    const completeResponse = await fetch(`/api/v1/cad/${cadFileId}/extractions/${runId}/complete`, { method: "POST" });
    if (!completeResponse.ok) throw new Error(await responseError(completeResponse, "The extracted CAD data did not pass server validation."));
  } catch (err) {
    // Cancel the incomplete server run so the file doesn't stay stuck in PARSING.
    await fetch(`/api/v1/cad/${cadFileId}/extractions/${runId}`, { method: "DELETE" }).catch(() => undefined);
    throw err;
  }
}

async function resolveSourceChecksum(bytes: ArrayBuffer, serverChecksum: string | null) {
  if (!serverChecksum) {
    throw new Error("The CAD source checksum is missing.");
  }
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const computed = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (computed !== serverChecksum) {
      throw new Error("The downloaded CAD file failed its integrity check.");
    }
  }
  return serverChecksum;
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error || fallback;
}

function dwgFriendlyError(fileName: string, message: string) {
  if (!fileName.toLowerCase().endsWith(".dwg")) return message;
  return `${message} This DWG may use an unsupported version, unresolved external references, encryption, or entities LibreDWG cannot interpret. Export it as DXF with external references bound or exploded, then upload it again.`;
}
