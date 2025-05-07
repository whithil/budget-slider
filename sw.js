const CACHE_NAME = 'budget-manager-v2.9-cache'; // Updated cache name
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'https://placehold.co/192x192/3498db/ffffff?text=Icon192' // Placeholder icon
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing v2.9...');
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
  console.log('[ServiceWorker] Activating v2.9...');
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
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(
          networkResponse => {
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('[ServiceWorker] Fetch failed, and not in cache:', error, event.request.url);
        });
      })
  );
});