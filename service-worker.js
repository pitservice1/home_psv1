const CACHE_NAME = "pit-service-cache-v1";
const urlsToCache = [
  "/index.html",
  "/manifest.json",
  "/icon.png",
  "/css/style.css",
];

// Install Service Worker
self.addEventListener("install", (event) => {
  console.log("🔄 Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Cache opened");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("❌ Cache error:", error);
      }),
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("🔄 Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match("/index.html");
        });
    }),
  );
});
