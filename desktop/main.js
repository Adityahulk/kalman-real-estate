// Electron main process for WIDESTATE OS desktop.
//
// Like the mobile (Capacitor) shell, this loads the LIVE hosted web app in a Chromium window
// instead of rewriting anything — so every module (CAD/WebGL, OpenLayers maps, the letter
// editor, PDF rendering) behaves exactly as it does in the browser. Because the window origin ==
// the production origin, the existing httpOnly cookie auth works unchanged.
//
// Configure the target with DESKTOP_SERVER_URL (defaults to production).

const { app, BrowserWindow, Menu, shell, session, dialog, ipcMain } = require("electron");
const path = require("path");
const { readFile, writeFile } = require("fs/promises");

const DEFAULT_SERVER_URL = process.env.DESKTOP_SERVER_URL || "https://widestateos.com";
let serverUrl = normaliseServerUrl(DEFAULT_SERVER_URL);
let appOrigin = new URL(serverUrl).origin;
const isDev = !app.isPackaged;

/** @type {BrowserWindow | null} */
let mainWindow = null;

function normaliseServerUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Enter an http:// or https:// server URL.");
  return url.toString().replace(/\/$/, "");
}

function serverConfigPath() {
  return path.join(app.getPath("userData"), "server-url.json");
}

async function restoreServerUrl() {
  if (process.env.DESKTOP_SERVER_URL) return;
  try {
    const saved = JSON.parse(await readFile(serverConfigPath(), "utf8"));
    if (typeof saved.serverUrl !== "string") return;
    serverUrl = normaliseServerUrl(saved.serverUrl);
    appOrigin = new URL(serverUrl).origin;
  } catch {
    // First launch or an invalid old config: retain the configured build default.
  }
}

async function setServerUrl(value) {
  const next = normaliseServerUrl(value);
  serverUrl = next;
  appOrigin = new URL(next).origin;
  await writeFile(serverConfigPath(), JSON.stringify({ serverUrl: next }, null, 2));
  loadApp();
  return next;
}

// Single-instance: focus the existing window instead of opening a second one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0b1220",
    show: false,
    title: "WIDESTATE OS",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Same-origin app; spellcheck on for the letter editor.
      spellcheck: true,
    },
  });

  // Show only once the first paint is ready to avoid a white flash over the dark shell.
  mainWindow.once("ready-to-show", () => mainWindow && mainWindow.show());

  loadApp();

  // Keep same-site popups (notably authenticated PDF previews) inside Electron. Sending those
  // links to the system browser loses this window's httpOnly session cookie, so protected file
  // endpoints would return "Unauthenticated". External destinations still use the real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin === appOrigin) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== appOrigin) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function loadApp() {
  if (!mainWindow) return;
  mainWindow.loadURL(serverUrl).catch(() => showOffline());
  // If the remote app can't be reached, fall back to a local offline page with a retry.
  mainWindow.webContents.on("did-fail-load", (_e, code, _desc, validatedURL, isMainFrame) => {
    // -3 (ABORTED) fires for benign in-app redirects; ignore it and sub-frame failures.
    if (isMainFrame && code !== -3 && validatedURL.startsWith(appOrigin)) showOffline();
  });
}

function showOffline() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, "offline.html")).catch(() => undefined);
}

// Route browser-initiated downloads (generated letter PDFs, shared files) to a save dialog and
// reveal the file when done — the desktop-native expectation.
function wireDownloads() {
  session.defaultSession.on("will-download", (_event, item) => {
    item.once("done", (_e, state) => {
      if (state === "completed") shell.showItemInFolder(item.getSavePath());
    });
  });
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { label: "Home", accelerator: "CmdOrCtrl+Shift+H", click: () => mainWindow && mainWindow.loadURL(serverUrl) },
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow && mainWindow.webContents.reload() },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "About WIDESTATE OS", click: () => showAbout() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAbout() {
  dialog.showMessageBox(mainWindow ?? undefined, {
    type: "info",
    title: "WIDESTATE OS",
    message: "WIDESTATE OS",
    detail: `Desktop shell\nConnected to: ${serverUrl}\nElectron ${process.versions.electron}`,
  });
}

app.whenReady().then(async () => {
  await restoreServerUrl();
  ipcMain.handle("desktop:get-server-url", () => serverUrl);
  ipcMain.handle("desktop:set-server-url", (_event, value) => setServerUrl(value));
  ipcMain.handle("desktop:retry-server", () => loadApp());
  wireDownloads();
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
