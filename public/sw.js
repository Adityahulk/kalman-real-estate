// Conservative offline service worker. It deliberately does NOT cache the app shell or API
// responses (Next.js assets are content-hashed and data must stay fresh) — it only serves a
// static offline fallback when a navigation request fails because the device is offline.
const OFFLINE_URL = "/offline.html";
const CACHE = "widestate-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate") return; // never intercept assets, API, or POSTs
  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r ?? Response.error())),
  );
});
