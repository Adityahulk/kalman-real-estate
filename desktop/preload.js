// Minimal, context-isolated bridge. The web app runs same-origin against the real server, so it
// needs almost nothing from the shell — we only expose a tiny, safe surface the web code can
// feature-detect (see isElectron() in src/lib/native.ts) plus version/platform info.

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("widestateDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});
