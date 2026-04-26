/* sw.js — minimal offline cache for hd-recipes.
 * Cache shell + data; pass-through for everything else.
 */
const CACHE = 'hdr-v1';
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

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Network-first for HTML (so authoring updates show fast); cache-first for assets.
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(e.request).then(m => m || caches.match('/index.html')))
    );
    return;
  }
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
