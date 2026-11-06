// Offline copy of the launcher (the apps themselves keep their own offline copies).
const VERSION = 'xp-1.0.0';
const FILES = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/main.js', 'js/apps.js', 'js/fx.js', 'js/sky.js', 'js/cube.js', 'js/logo.js', 'js/sound.js', 'js/scan.js', 'js/cv/detector.js',
  'js/scenes/common.js', 'js/scenes/cat.js', 'js/scenes/muzej.js', 'js/scenes/mapa.js', 'js/scenes/kocka.js', 'js/scenes/slagalica.js', 'js/scenes/staze.js', 'js/scenes/mace.js',
  'vendor/three/three.core.min.js', 'vendor/three/three.module.min.js',
  'vendor/three/addons/environments/RoomEnvironment.js', 'vendor/three/addons/geometries/RoundedBoxGeometry.js',
  'vendor/three/addons/loaders/GLTFLoader.js', 'vendor/three/addons/libs/meshopt_decoder.module.js',
  'vendor/three/addons/utils/BufferGeometryUtils.js', 'vendor/three/addons/utils/SkeletonUtils.js',
  'data/skyline.json', 'data/cube.json', 'data/teren.json', 'data/town.glb',
  'fonts/marcellus.woff', 'fonts/golos.woff', 'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('xp-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // the page itself: network first so updates arrive; everything else: cache first
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put('index.html', c)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
