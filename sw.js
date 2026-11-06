// Service Worker: hält die App offline verfügbar.
// Bei jeder Änderung an App-Dateien VERSION erhöhen, damit Geräte das Update erhalten.

const VERSION = 'lufttools-v1.2.0';

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/ui/dom.js',
  './js/core/units.js',
  './js/core/air.js',
  './js/core/flow.js',
  './js/core/pressure.js',
  './js/core/geometry.js',
  './js/data/firmendaten.js',
  './js/tools/umrechner.js',
  './js/tools/druckverlust.js',
  './js/tools/geometrie.js',
  './js/tools/firmendaten.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN.map((d) => new Request(d, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const kopie = res.clone();
            caches.open(VERSION).then((c) => c.put(req, kopie));
          }
          return res;
        }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
