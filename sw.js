// ============================================
// Service Worker - Pit Service 1
// Strategi:
// - HTML & version.json: NETWORK-FIRST, NO CACHE
// - Asset statis (CDN, font, gambar): CACHE-FIRST
// ============================================

const SW_VERSION = 'psv1-sw-2025-01-15-v2'; // GANTI SETIAP COMMIT
const STATIC_CACHE = 'psv1-static-' + SW_VERSION;

// Daftar asset statis yang boleh di-cache (BUKAN HTML)
const STATIC_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.phototourl.com/free/2026-08-13-d76861c3-caa6-4b2c-b9aa-526379a6b839.png'
];

// ===== INSTALL: Langsung aktif, cache asset statis =====
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Beberapa asset gagal di-cache:', err);
      });
    })
  );
});

// ===== ACTIVATE: Hapus cache lama, klaim klien =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k.startsWith('psv1-'))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH: Routing pintar =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET
  if (req.method !== 'GET') return;

  // Skip chrome-extension, dll
  if (!url.protocol.startsWith('http')) return;

  // === RULE 1: HTML & version.json → NETWORK-FIRST, NO CACHE ===
  const isHTML = req.mode === 'navigate' ||
                 req.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('version.json');

  if (isHTML) {
    event.respondWith(
      fetch(req, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      .then(response => response) // JANGAN cache HTML
      .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // === RULE 2: Asset statis (CDN, font, gambar) → CACHE-FIRST ===
  const isStatic = url.hostname.includes('cdn.jsdelivr.net') ||
                   url.hostname.includes('cdnjs.cloudflare.com') ||
                   url.hostname.includes('fonts.googleapis.com') ||
                   url.hostname.includes('fonts.gstatic.com') ||
                   url.hostname.includes('cdn.phototourl.com') ||
                   url.hostname.includes('unsplash.com') ||
                   /\.(css|js|png|jpg|jpeg|svg|woff2?|ttf|ico)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(req, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // === RULE 3: Lainnya → NETWORK-ONLY ===
  event.respondWith(fetch(req).catch(() => new Response('Offline', { status: 503 })));
});

// ===== MESSAGE: Terima perintah SKIP_WAITING dari halaman =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
