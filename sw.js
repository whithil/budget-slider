const CACHE_NAME = 'budget-manager-v2.4-cache'; // Alterado para nova versão
const urlsToCache = [
  '/', // Alias para index.html
  'index.html',
  'style.css',
  'app.js',
  // Adicione aqui os caminhos para seus ícones reais depois de substituí-los
  // Ex: 'icons/icon-192x192.png',
  'https://placehold.co/192x192/3498db/ffffff?text=Icon192' // Exemplo de ícone em cache
];

// Evento de Instalação: Cacheia os assets principais
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Cache aberto, adicionando assets ao cache:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Todos os assets foram cacheados com sucesso.');
        return self.skipWaiting(); // Força o service worker a ativar
      })
      .catch(error => {
        console.error('[ServiceWorker] Falha ao cachear assets durante a instalação:', error);
      })
  );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Caches antigos deletados, cliente controlado.');
        return self.clients.claim(); // Controla clientes não controlados imediatamente
    })
  );
});

// Evento Fetch: Intercepta requisições de rede
self.addEventListener('fetch', event => {
  // Apenas para requisições GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Retorna do cache se encontrado
        if (cachedResponse) {
          // console.log('[ServiceWorker] Recurso encontrado no cache:', event.request.url);
          return cachedResponse;
        }

        // Se não estiver no cache, busca na rede
        // console.log('[ServiceWorker] Recurso não encontrado no cache, buscando na rede:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Verifica se recebemos uma resposta válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clona a resposta. Uma stream só pode ser consumida uma vez.
            // Precisamos de uma para o browser e uma para o cache.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('[ServiceWorker] Adicionando recurso ao cache:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('[ServiceWorker] Erro ao buscar na rede:', error, event.request.url);
            // Você pode retornar uma página offline customizada aqui, se desejar
            // return caches.match('offline.html');
        });
      })
  );
});