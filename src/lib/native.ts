"use client";

// Native (Capacitor) bridge. Every export is safe to call on the plain web build: `isNative()`
// is false there and the heavy plugin modules are only ever dynamically imported inside the
// native branch, so nothing native is bundled into or executed by the browser app.

import { Capacitor } from "@capacitor/core";

const SESSION_TOKEN_KEY = "kalman_session_token";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// True inside the Electron desktop shell (which exposes window.widestateDesktop via preload).
// The desktop app is same-origin and cookie-authed like the browser, so this is only for optional
// UX tweaks (e.g. suppressing web-only install prompts) — not required for any core flow.
export function isElectron(): boolean {
  try {
    return typeof window !== "undefined" && Boolean((window as unknown as { widestateDesktop?: unknown }).widestateDesktop);
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

// Persist the JWT returned in the login response body so native plugin-context requests (camera
// upload, push registration) can authenticate with a bearer header, and so the session survives
// an app relaunch. No-op on web, where the httpOnly cookie is the source of truth.
export async function storeSessionToken(token: string | undefined | null): Promise<void> {
  if (!isNative() || !token) return;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: SESSION_TOKEN_KEY, value: token });
}

export async function getSessionToken(): Promise<string | null> {
  if (!isNative()) return null;
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: SESSION_TOKEN_KEY });
  return value ?? null;
}

export async function clearSessionToken(): Promise<void> {
  if (!isNative()) return;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key: SESSION_TOKEN_KEY });
}

// fetch wrapper that attaches the stored bearer token on native. On web it's a passthrough, so
// existing cookie auth is untouched.
export async function nativeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!isNative()) return fetch(input, init);
  const token = await getSessionToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// Register this device for push and forward the OS token to the backend. Called after login.
export async function registerForPush(): Promise<void> {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    PushNotifications.addListener("registration", (token) => {
      void nativeFetch("/api/v1/notifications/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.value, platform: nativePlatform() }),
      }).catch(() => undefined);
    });
    await PushNotifications.register();
  } catch {
    // Push is best-effort; never block login on it.
  }
}

// Optional biometric gate hook. Intentionally a no-op: the only Capacitor biometric plugin
// (@aparajita/capacitor-biometric-auth) drags in a BouncyCastle build that breaks the Android
// Gradle build, so it is not bundled. The signature is kept so a future, build-compatible
// biometric plugin can be wired in here without touching callers. Returns true = proceed.
export async function biometricUnlock(): Promise<boolean> {
  return true;
}

// One-time native shell setup: status bar + splash. Safe/no-op on web.
export async function initNativeShell(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // ignore
  }
}
