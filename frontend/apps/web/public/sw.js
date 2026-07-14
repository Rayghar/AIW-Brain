const SHELL_CACHE = 'aiw-shell-v0.10.0-rc.2';
const RUNTIME_CACHE = 'aiw-runtime-v0.10.0-rc.2';
const SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isSensitiveApi(request, url) {
  return url.pathname.startsWith('/api/') || request.headers.has('authorization') || request.headers.has('x-aiw-dev-token');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isSensitiveApi(request, url)) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: 'OFFLINE', message: 'Connected services are unavailable. AIW remains available in local deterministic mode.' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => {
    const network = fetch(request).then((response) => {
      if (response.ok && ['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached);
    return cached || network;
  }));
});
