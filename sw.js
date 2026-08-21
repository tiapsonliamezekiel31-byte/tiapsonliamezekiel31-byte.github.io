const CACHE_NAME = 'nemesis-ultimate-roguelike-20260821-1818';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './css/style.css',
  './css/style_tycoon.css',
  './JS/config.js',
  './JS/core.js',
  './JS/animations.js',
  './JS/player.js',
  './JS/tasks.js',
  './JS/enemy.js',
  './JS/stage.js',
  './JS/combat.js',
  './JS/sound.js',
  './JS/shop.js',
  './JS/ui.js',
  './JS/popups.js',
  './JS/multiplayer.js',
  './JS/tycoon_worker_code.js',
  './JS/tycoon.js',
  './trees.png',
  './cropsstylesheet.png'
];

// Install: cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin (Firebase, gstatic) requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Skip waiting when asked by the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
