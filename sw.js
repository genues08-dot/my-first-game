// Offline support: serve saved copies instantly, refresh them in the background.
// Updates show up the next time the app is opened. Add new files to FILES.
const CACHE = 'brain-games-v4';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.json',
  'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'games/memory-sequence.js', 'games/quick-math.js', 'games/code-breaker.js', 'games/card-match.js', 'games/whats-next.js', 'games/odd-one-out.js', 'games/snake.js', 'snake.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((cached) => {
        const fresh = fetch(e.request)
          .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => cached);
        return cached || fresh;
      })
    )
  );
});
