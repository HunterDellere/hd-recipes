/* sw.js — minimal offline cache for hd-recipes.
 * Network-first for HTML, JS, CSS, and JSON data (so authoring updates
 * always show); cache-first for static assets (images, fonts).
 *
 * Bump CACHE when shipping a breaking change to invalidate older caches.
 */
const CACHE = 'hdr-v3';
const SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/style-home.css',
  '/scripts/homepage.js',
  '/scripts/recipe.js',
  '/scripts/enhance.js',
  '/scripts/toc-scroll.js',
  '/data/entries.json',
  '/data/recent.json',
  '/data/category-meta.json',
  '/data/search-index.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

function isFreshAsset(url) {
  // Files that change with deploys → network-first so stale caches don't bite
  return /\.(html|js|css|json)(\?|$)/.test(url.pathname) || url.pathname === '/';
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (isFreshAsset(url) || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return r;
      }).catch(() => caches.match(e.request).then(m => m || caches.match('/index.html')))
    );
    return;
  }

  // Other assets (images, fonts, OG SVGs) — cache-first is fine
  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return r;
    }))
  );
});
