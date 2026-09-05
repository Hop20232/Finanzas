const CACHE_NAME = 'finanzas-public-v1';
const PUBLIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/js/core/state.js',
  '/js/core/ui.js',
  '/js/modules/auth.js',
  '/js/modules/calculations.js',
  '/js/modules/categories.js',
  '/js/modules/comparison.js',
  '/js/modules/dashboard.js',
  '/js/modules/io.js',
  '/js/modules/rates.js',
  '/js/modules/templates.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok && requestUrl.pathname !== '/sw.js') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
