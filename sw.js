const CACHE = "sengoku-3d-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles/index.css",
  "./styles/battle-sim.css",
  "./scripts/battle-sim.js",
  "./data/battles-index.js",
  "./data/extra-battle-scenes.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const request = event.request;
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
      return cached || network;
    })
  );
});
