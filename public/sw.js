const CACHE_NAME = 'flare-v24';

// Recursos del app shell que se cachean al instalar
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/theme-dark.css',
  '/js/app.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
];

// Instalar: cachear el app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activar: eliminar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estrategia según el tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Llamadas a la API y tiles del mapa → siempre red (no cachear)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('tile.opentopomap') ||
    url.hostname.includes('nominatim')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // App shell y assets estáticos → cache-first, fallback a red
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cachear solo respuestas válidas de nuestro origen o CDNs conocidos
        if (
          response.ok &&
          (url.origin === self.location.origin ||
            url.hostname.includes('unpkg.com') ||
            url.hostname.includes('fonts.googleapis.com') ||
            url.hostname.includes('fonts.gstatic.com'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
