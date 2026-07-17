"use client";

import { useEffect } from "react";
import { initNativeShell, isNative } from "@/lib/native";

// Boots progressive-enhancement layers: registers the offline service worker on the plain web
// build, and hides the splash / preps the status bar inside the native (Capacitor) shell. Renders
// nothing.
export function PwaNativeBoot() {
  useEffect(() => {
    if (isNative()) {
      void initNativeShell();
      return; // Service workers are unnecessary (and can be flaky) inside the native WebView.
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return null;
}
