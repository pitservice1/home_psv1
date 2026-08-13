// Naikkan versi cache agar perubahan Service Worker langsung terbaca
const CACHE_NAME = "pit-service-cache-v4";

const CDN_ICON_URL = "https://cdn.phototourl.com/free/2026-08-13-d76861c3-caa6-4b2c-b9aa-526379a6b839.png";
const LOCAL_ICON_URL = "/icon.png";

// Pastikan icon.png lokal masuk ke dalam pre-cache
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  LOCAL_ICON_URL
];

self.addEventListener("install", (event) => {
  console.log("🔄 Installing Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("✅ Cache opened, pre-caching local files");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("🔄 Activating Service Worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("🗑️ Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) return;

  // ==========================================
  // LOGIKA KHUSUS: CDN vs LOCAL ICON
  // ==========================================
  if (event.request.url === CDN_ICON_URL) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Jika sedang online dan sukses, gunakan CDN
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            return networkResponse;
          }
          // Jika URL CDN error/mati, fallback ke icon lokal
          return caches.match(LOCAL_ICON_URL);
        })
        .catch(() => {
          // Jika tidak ada koneksi internet (Offline), fallback ke icon lokal
          console.log("📶 Offline detected! Serving local icon instead of CDN.");
          return caches.match(LOCAL_ICON_URL);
        })
    );
    return; // Hentikan proses fetch di sini khusus untuk URL icon
  }

  // ==========================================
  // LOGIKA STANDAR UNTUK FILE LAINNYA
  // ==========================================
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. Ambil dari cache dulu jika ada
      if (response) return response;

      // 2. Jika tidak ada di cache, ambil dari network
      return fetch(event.request)
        .then((networkResponse) => {
          const isValidResponse = networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque');
          if (!isValidResponse) return networkResponse;

          // Simpan ke cache untuk penggunaan offline selanjutnya
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Fallback halaman index jika navigasi offline
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
