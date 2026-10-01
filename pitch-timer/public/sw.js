// Offline support: once a screen has been opened online, it can be reloaded
// without internet. Live data still comes from Firebase (not cached here);
// the app shows the last known session from localStorage until it reconnects.

const CACHE = "pitch-timer-v1";
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, fonts etc. go straight to the network

  // Hashed build assets and logos never change for a given URL: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  // Pages and data: fresh when online, cached copy when offline or very slow.
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}
