/* hd · recipes — service worker
 *
 * Strategy:
 *   - Install: pre-cache the static shell (style, scripts, manifest, icons).
 *     Data JSON is NOT pre-cached — it's content, not shell.
 *   - Fetch (HTML + data JSON): network-first, fall back to cache, fall back
 *     to cached homepage. Data needs to be fresh on every online visit;
 *     pre-caching it into SHELL_CACHE caused `caches.match` to keep returning
 *     the install-time snapshot of recent.json/entries.json forever (until
 *     VERSION bumped). Network-first is the only correct strategy for content
 *     that changes between releases without a SW update.
 *   - Fetch (other GET, same-origin): stale-while-revalidate so visited pages
 *     and static assets load instantly.
 *   - Cross-origin (Google Fonts): cache-first with refresh so offline reading
 *     still works.
 *
 * Bump VERSION when shipping a breaking change to invalidate older caches.
 */
const VERSION = 'hdr-v9';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './style-home.css',
  './scripts/homepage.js',
  './scripts/recipe.js',
  './scripts/toc-scroll.js',
  './scripts/enhance.js',
  './scripts/lightbox.js',
  './scripts/palette.js',
  './scripts/hover-card.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(() => null))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isHtmlRequest(req) {
  return req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));
}

function isDataRequest(url) {
  return url.pathname.includes('/data/') && url.pathname.endsWith('.json');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // HTML + data JSON: network-first. Both need to reflect the latest deploy on
  // every online visit; cache is only a navigation/offline fallback.
  if (isHtmlRequest(req) || isDataRequest(url)) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // Same-origin static: stale-while-revalidate
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin (Google Fonts): cache-first with refresh
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
