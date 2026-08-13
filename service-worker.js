// 1. Naikkan versi cache agar browser membuang cache lama
const CACHE_NAME = "pit-service-cache-v2";

// 2. URL icon eksternal CDN
const ICON_URL = "https://cdn.phototourl.com/free/2026-08-13-d76861c3-caa6-4b2c-b9aa-526379a6b839.png";

const urlsToCache = [
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  ICON_URL // Masukkan URL icon CDN ke dalam precache
];

// Install Service Worker
self.addEventListener("install", (event) => {
  console.log("🔄 Installing Service Worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Cache opened");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("❌ Cache install error:", error);
      }),
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
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch (Pengambilan dan Pembaharuan Cache)
self.addEventListener("fetch", (event) => {
  // Abaikan request bukan GET (misal POST/PUT) atau ekstensi browser
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. Jika file ada di cache, kembalikan dari cache
      if (response) return response;

      // 2. Jika belum ada, ambil dari jaringan
      return fetch(event.request)
        .then((networkResponse) => {
          // PERBAIKAN: Dukung Opaque Response (status 0) untuk aset CDN cross-origin
          const isValidResponse = networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque');

          if (!isValidResponse) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Fallback offline jika navigasi halaman gagal
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    }),
  );
});
