const CACHE_NAME = 'feitosa-crm-static-v1';
const STATIC_ASSETS = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/icons.js', './js/config.js', './js/state.js', './js/utils.js',
  './js/navigation.js', './js/dashboard.js', './js/advanced-features.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && event.request.method === 'GET') {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match('./index.html')));
});
