/* Arena Royal service worker.
 * Deliberately minimal: page navigations always go to the network so a new
 * deploy is picked up immediately (no stale app shell). Only when the network
 * fails do we show a small offline page. Nothing else is cached or intercepted.
 */
const OFFLINE_CACHE = 'arena-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL)))
  );
});
