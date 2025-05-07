const CACHE_NAME = 'budget-manager-v2.7-cache'; // Updated cache name
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'https://placehold.co/192x192/3498db/ffffff?text=Icon192' // Placeholder icon
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing v2.7...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation successful, skipping waiting.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating v2.7...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Old caches deleted, claiming clients.');
        return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  // Network first, then cache strategy for dynamic content or frequent updates.
  // For a mostly static shell with dynamic data managed by JS, cache-first is often fine.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Check if we received a valid response
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network request failed, try to get it from the cache.
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache and network failed, you could return a generic fallback page.
            // For this app, if core files are cached, it should mostly work offline once loaded.
            console.warn('[ServiceWorker] Resource not found in cache or network:', event.request.url);
            // return caches.match('/offline.html'); // Example fallback
          });
      })
  );
});