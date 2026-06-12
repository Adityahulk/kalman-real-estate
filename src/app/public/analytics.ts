"use client";

type LandingEvent = {
  name: string;
  location?: string;
  detail?: Record<string, string | number | boolean | undefined>;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackLandingEvent(event: LandingEvent) {
  if (typeof window === "undefined") return;
  const payload = {
    event: event.name,
    location: event.location,
    ...event.detail,
    timestamp: new Date().toISOString(),
  };
  window.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("widestate:analytics", { detail: payload }));
}
