# WIDESTATE OS — Desktop (Electron)

A thin Electron shell that loads the **live hosted web app** in a Chromium window, so every
feature (CAD/WebGL, maps, letter editor, PDF) behaves exactly as in the browser. No rewrite —
same principle as the mobile (Capacitor) shell. Because the window origin equals the server
origin, the existing httpOnly cookie auth works unchanged.

## Configure the target server

The shell connects to `DESKTOP_SERVER_URL` (defaults to `https://widestateos.com`):

```bash
export DESKTOP_SERVER_URL="https://app.your-domain.com"   # your deployed web app
```

If a release was built without the correct URL, the offline screen lets the Mac user enter and
save the hosted app URL locally, then reconnect without rebuilding the installer.

For local development you can point it at your dev server (use a LAN IP or a tunnel, not
`localhost`, if testing from another machine):

```bash
export DESKTOP_SERVER_URL="http://localhost:3000"
```

## Run in development

```bash
npm run desktop:install     # from repo root — installs Electron into desktop/
npm run desktop:dev         # launches the app window
```

## Build installers

```bash
npm run desktop:dist        # current OS
# or per-OS (must build macOS on a Mac, Windows on Windows/CI):
npm --prefix desktop run dist:mac     # .dmg + .zip
npm --prefix desktop run dist:win     # NSIS .exe installer
npm --prefix desktop run dist:linux   # AppImage + .deb
```

Output lands in `desktop/release/`.

## Signing & notarisation (production)

- **macOS:** set `CSC_LINK` / `CSC_KEY_PASSWORD` (Developer ID cert) and Apple notarisation
  credentials (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) for `electron-builder`.
- **Windows:** set `CSC_LINK` / `CSC_KEY_PASSWORD` with an Authenticode cert.

Unsigned builds run locally but show OS security prompts on other machines.
