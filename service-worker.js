const CACHE_NAME = "pit-service-cache-v3"; // Versi dinaikkan

// Hanya cache file lokal saat tahap instalasi (pre-cache)
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/style.css"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  console.log("🔄 Installing Service Worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Cache opened, caching local assets");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("❌ Cache install error:", error);
      })
  );
  self.skipWaiting();
});

// Activate (Penghapusan Cache Lama)
self.addEventListener("activate", (event) => {
  console.log("🔄 Activating Service Worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch (Pengambilan, Pembaharuan Cache Dinamis, dan Fallback Offline)
self.addEventListener("fetch", (event) => {
  // Abaikan request bukan GET atau request ke skema non-http (seperti chrome-extension://)
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. Jika ada di cache, langsung kembalikan
      if (response) return response;

      // 2. Jika tidak ada, ambil dari jaringan
      return fetch(event.request)
        .then((networkResponse) => {
          // Dukung Opaque Response (status 0) untuk aset CDN/Cross-Origin
          const isValidResponse = networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque');

          if (!isValidResponse) {
            return networkResponse;
          }

          // Simpan ke cache secara dinamis
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // 3. Fallback jika offline dan pengguna melakukan navigasi ke halaman html lain
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
