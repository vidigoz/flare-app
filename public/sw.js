const CACHE_NAME = 'flare-v82';

const CDN_HOSTS = [
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Instalar — no pre-cachear nada, activar inmediatamente
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activar — eliminar caches viejos y tomar control de todas las tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API y tiles del mapa → siempre red, nunca cachear
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('tile.opentopomap') ||
    url.hostname.includes('nominatim')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // CDN (Leaflet, fonts) → cache-first, no cambian nunca
  if (CDN_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Archivos propios (HTML, CSS, JS, assets) → network-first
  // Siempre busca en red para reflejar cambios inmediatamente.
  // Si no hay red, sirve desde caché como fallback offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
