// Service worker: lets the game install as an app and run offline.
// Pages and scripts: network first, so updates show up as soon as you're online; the cache covers offline.
// Images and icons: cache first (they rarely change). Bump VERSION to force everything to refresh.
const VERSION = 'v39';
const CACHE = `battler-${VERSION}`;
const CORE = [
  'menu.html', 'prep.html', 'battle.html', 'rarity.js', 'pool.js', 'profile.js', 'auth.js', 'turn.js', 'nav.js', 'sync.js', 'runmenu.js', 'sim.js', 'rules.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => fetch(u).then(res => { if (!res.ok) throw new Error(u); return c.put(u, clean(res)); }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('battler-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Some hosts redirect menu.html to /menu. A redirected response can't answer a page load, so store a plain copy.
const clean = res => res.redirected ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers }) : res;

const put = (req, res) => {
  if (res.ok || res.type === 'opaque') { const copy = clean(res.clone()); caches.open(CACHE).then(c => c.put(req, copy)); } // clone now, before the page reads the body
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;
  if (url.pathname.startsWith('/api/')) return; // server calls always go to the network

  // Fonts: serve the cached copy, refresh it in the background
  if (fonts) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => put(req, res)).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Images and icons: cache first
  if (/\.(png|svg|jpg|webp)$/i.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
    return;
  }
  // Pages, scripts, everything else: network first, cache when offline (query strings ignored for pages)
  e.respondWith(fetch(req).then(res => put(req, res))
    .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' })));
});
