const CACHE_VERSION = "duka-broilers-pwa-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/apple-touch-icon.png",
];
const PRIVATE_PREFIXES = ["/api/", "/account", "/admin", "/checkout", "/supplier"];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
function isStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/") || pathname === "/apple-touch-icon.png" || /\.(?:css|js|woff2?|png|jpg|jpeg|webp|svg|ico)$/i.test(pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("duka-broilers-pwa-") && key !== STATIC_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || new Response("You are offline.", { status: 503 })));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) void caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
