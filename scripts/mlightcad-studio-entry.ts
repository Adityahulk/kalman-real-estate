import { createApp, h } from "vue";
import ElementPlus from "element-plus";
import { i18n, MlCadViewer } from "@mlightcad/cad-viewer";
import {
  AcApDocManager,
  AcApSettingManager,
  AcEdOpenMode,
} from "@mlightcad/cad-simple-viewer";
import { acdbHostApplicationServices } from "@mlightcad/data-model";
import {
  extractMlightCadDatabase,
  type BrowserCadExtraction,
} from "../src/app/app/cad/[id]/mlightcad/mlightcad-extractor";

type StudioMessage =
  | { type: "kalman:studio-command"; command: string; payload?: unknown }
  | {
      type: "kalman:studio-open";
      bytes: ArrayBuffer;
      fileName: string;
      cadFileId: string;
      sourceSha256: string;
      autoExtract: boolean;
    };

type StudioState = {
  selectedHandles: string[];
  hiddenLayers: string[];
  activeLayout: string | null;
};

const root = requiredRoot();

const settings = AcApSettingManager.instance;
settings.isShowToolbar = true;
settings.isShowCommandLine = true;
settings.isShowCoordinate = true;
settings.isShowEntityInfo = true;
settings.isShowFileName = false;
settings.isShowLanguageSelector = false;
settings.isShowMainMenu = false;
settings.isShowStats = false;

let app: ReturnType<typeof createApp> | null = null;
let selectionAddedListener: ((event: { ids: string[] }) => void) | null = null;
let selectionRemovedListener: ((event: { ids: string[] }) => void) | null = null;
let viewChangedListener: (() => void) | null = null;
let documentActivatedListener: (() => void) | null = null;
let layoutSwitchedListener: ((event: { layout: { layoutName?: string; blockTableRecordId: string } }) => void) | null = null;
let stateTimer: number | null = null;
let managerTimer: number | null = null;
let drawingReady = false;
const selectedHandles = new Set<string>();
let openOptions: Extract<StudioMessage, { type: "kalman:studio-open" }> | null = null;

window.addEventListener("message", (event: MessageEvent<StudioMessage>) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "kalman:studio-open") {
    openOptions = event.data;
    mountViewer(event.data.fileName, event.data.bytes);
    return;
  }
  if (event.data?.type !== "kalman:studio-command") return;
  executeCommand(event.data.command, event.data.payload);
});

window.parent.postMessage({ type: "kalman:studio-mounted" }, window.location.origin);

function mountViewer(fileName: string, bytes: ArrayBuffer) {
  teardownViewer();
  const file = new File([bytes], fileName, { type: cadMimeType(fileName) });
  app = createApp({
    render: () => h(MlCadViewer, {
      locale: "en",
      localFile: file,
      mode: AcEdOpenMode.Review,
      theme: "dark",
      background: 0x10151c,
      baseUrl: "https://cdn.jsdelivr.net/gh/mlightcad/cad-data/",
      useMainThreadDraw: true,
      onCreate: onViewerCreated,
      onDestroy: () => post("kalman:studio-destroyed"),
    }),
  });
  app.use(i18n);
  app.use(ElementPlus);
  app.mount(root);
  waitForViewerShell();
}

function waitForViewerShell(attempt = 0) {
  try {
    const manager = AcApDocManager.instance;
    post("kalman:studio-shell-ready");
    documentActivatedListener = () => void onDrawingReady();
    manager.events.documentActivated.addEventListener(documentActivatedListener);
    return;
  } catch {
    if (attempt >= 400) {
      post("kalman:studio-extraction-error", { message: "The CAD Studio interface could not start." });
      return;
    }
    managerTimer = window.setTimeout(() => waitForViewerShell(attempt + 1), 25);
  }
}

function onViewerCreated() {
  void onDrawingReady();
}

async function onDrawingReady() {
  if (drawingReady) return;
  drawingReady = true;
  const manager = AcApDocManager.instance;
  selectionAddedListener = ({ ids }) => {
    for (const id of ids) selectedHandles.add(String(id));
    post("kalman:studio-selection", { handles: [...selectedHandles] });
    schedulePostState();
  };
  selectionRemovedListener = ({ ids }) => {
    for (const id of ids) selectedHandles.delete(String(id));
    post("kalman:studio-selection", { handles: [...selectedHandles] });
    schedulePostState();
  };
  viewChangedListener = schedulePostState;
  manager.curView.selectionSet.events.selectionAdded.addEventListener(selectionAddedListener);
  manager.curView.selectionSet.events.selectionRemoved.addEventListener(selectionRemovedListener);
  manager.curView.events?.viewChanged?.addEventListener?.(viewChangedListener);
  layoutSwitchedListener = ({ layout }) => {
    window.setTimeout(() => {
      const record = manager.curDocument.database.tables.blockTable.getIdAt?.(layout.blockTableRecordId);
      const entityCount = record?.newIterator ? Array.from(record.newIterator()).length : 0;
      post("kalman:studio-layout", {
        layoutName: layout.layoutName ?? "Layout",
        blockTableRecordId: layout.blockTableRecordId,
        entityCount,
        empty: entityCount === 0,
      });
      schedulePostState();
    }, 80);
  };
  acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(layoutSwitchedListener);
  post("kalman:studio-ready", { state: readState() });
  if (openOptions?.autoExtract) {
    await runExtraction();
  }
}

function executeCommand(command: string, payload: unknown) {
  const manager = currentManager();
  if (!manager?.curView) return;
  if (command === "fit") {
    manager.curView.zoomToFitDrawing();
  } else if (command === "select") {
    const handles = Array.isArray(payload) ? payload.map(String) : [];
    manager.curView.selectionSet.clear();
    for (const handle of handles) manager.curView.selectionSet.add(handle);
  } else if (command === "restore") {
    restoreState(payload as Partial<StudioState>);
  } else if (command === "get-state") {
    postState();
  } else if (command === "extract") {
    void runExtraction();
  } else {
    manager.sendStringToExecute(command);
  }
}

async function runExtraction() {
  const manager = currentManager();
  if (!manager || !openOptions) return;
  try {
    post("kalman:studio-extraction-progress", { message: "Reconstructing individual plots from CAD topology" });
    const extraction = extractMlightCadDatabase(
      manager.curDocument.database as unknown as Parameters<typeof extractMlightCadDatabase>[0],
    );
    await uploadExtraction(
      openOptions.cadFileId,
      openOptions.sourceSha256,
      extraction,
    );
    post("kalman:studio-extraction-complete");
  } catch (reason) {
    post("kalman:studio-extraction-error", {
      message: reason instanceof Error ? reason.message : "Browser extraction failed.",
    });
  }
}

function readState(): StudioState {
  const manager = AcApDocManager.instance;
  const database = manager.curDocument?.database;
  const hiddenLayers: string[] = [];
  if (database?.tables?.layerTable?.newIterator) {
    for (const layer of database.tables.layerTable.newIterator()) {
      if (layer.isOff || layer.isFrozen) hiddenLayers.push(layer.name);
    }
  }
  return {
    selectedHandles: [...selectedHandles],
    hiddenLayers,
    activeLayout: database?.currentSpaceId ? String(database.currentSpaceId) : null,
  };
}

function restoreState(state: Partial<StudioState>) {
  const manager = AcApDocManager.instance;
  if (state.activeLayout && state.activeLayout !== String(manager.curDocument.database.currentSpaceId)) {
    acdbHostApplicationServices().layoutManager.setCurrentLayoutBtrId(
      state.activeLayout,
      manager.curDocument.database,
    );
  }
  if (Array.isArray(state.selectedHandles)) {
    selectedHandles.clear();
    manager.curView.selectionSet.clear();
    for (const handle of state.selectedHandles) {
      selectedHandles.add(handle);
      manager.curView.selectionSet.add(handle);
    }
  }
  if (Array.isArray(state.hiddenLayers)) {
    const hidden = new Set(state.hiddenLayers);
    const table = manager.curDocument?.database?.tables?.layerTable;
    if (table?.newIterator) {
      for (const layer of table.newIterator()) {
        manager.curView.updateLayer(layer, { isOff: hidden.has(layer.name) });
      }
    }
  }
  postState();
}

function postState() {
  post("kalman:studio-state", { state: readState() });
}

function schedulePostState() {
  if (stateTimer !== null) window.clearTimeout(stateTimer);
  stateTimer = window.setTimeout(() => {
    stateTimer = null;
    postState();
  }, 300);
}

function teardownViewer() {
  const manager = currentManager();
  const selection = manager?.curView?.selectionSet?.events;
  if (selectionAddedListener) {
    selection?.selectionAdded?.removeEventListener(selectionAddedListener);
    selectionAddedListener = null;
  }
  if (selectionRemovedListener) {
    selection?.selectionRemoved?.removeEventListener(selectionRemovedListener);
    selectionRemovedListener = null;
  }
  if (viewChangedListener) {
    manager?.curView?.events?.viewChanged?.removeEventListener?.(viewChangedListener);
    viewChangedListener = null;
  }
  if (documentActivatedListener) {
    manager?.events?.documentActivated?.removeEventListener(documentActivatedListener);
    documentActivatedListener = null;
  }
  if (layoutSwitchedListener) {
    acdbHostApplicationServices().layoutManager.events.layoutSwitched.removeEventListener(layoutSwitchedListener);
    layoutSwitchedListener = null;
  }
  if (stateTimer !== null) {
    window.clearTimeout(stateTimer);
    stateTimer = null;
  }
  if (managerTimer !== null) {
    window.clearTimeout(managerTimer);
    managerTimer = null;
  }
  drawingReady = false;
  selectedHandles.clear();
  app?.unmount();
  app = null;
  root.replaceChildren();
}

function currentManager() {
  try {
    return AcApDocManager.instance;
  } catch {
    return null;
  }
}

function post(type: string, payload: Record<string, unknown> = {}) {
  window.parent.postMessage({ type, ...payload }, window.location.origin);
}

function cadMimeType(fileName: string) {
  return fileName.toLowerCase().endsWith(".dwg")
    ? "application/acad"
    : "application/dxf";
}

function requiredRoot() {
  const element = document.getElementById("app");
  if (!element) throw new Error("CAD Studio mount element is missing.");
  return element;
}

async function uploadExtraction(
  cadFileId: string,
  sourceSha256: string,
  extraction: BrowserCadExtraction,
) {
  if (!extraction.entities.length) {
    throw new Error("The drawing opened, but no reviewable plot boundaries or site assets were detected.");
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
      post("kalman:studio-extraction-progress", {
        message: `Validating drawing data ${index + 1} of ${chunks.length}`,
      });
      const response = await fetch(`/api/v1/cad/${cadFileId}/extractions/${runId}/chunks/${index}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entities: chunks[index] }),
      });
      if (!response.ok) throw new Error(await responseError(response, `Could not upload extraction part ${index + 1}.`));
    }
    post("kalman:studio-extraction-progress", { message: "Building the review scene" });
    const completed = await fetch(`/api/v1/cad/${cadFileId}/extractions/${runId}/complete`, { method: "POST" });
    if (!completed.ok) throw new Error(await responseError(completed, "The extracted drawing did not pass server validation."));
  } catch (error) {
    await fetch(`/api/v1/cad/${cadFileId}/extractions/${runId}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error || fallback;
}
