const CACHE_NAME = 'parole-v1';
const DICT_URL = 'https://raw.githubusercontent.com/napolux/paroleitaliane/master/paroleitaliane/110000_parole_italiane_con_nomi_propri.txt';

const STATIC_ASSETS = [
  '/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Dizionario: cache-first, così dopo il primo download non si riscarica più.
  // L'aggiornamento si forza bumpando CACHE_NAME quando il dizionario upstream cambia.
  if (url === DICT_URL) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Navigazione/asset stessa origine: network-first con fallback a cache (offline).
  if (request.method === 'GET' && url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
  }
});
