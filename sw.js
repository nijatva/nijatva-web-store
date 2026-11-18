/* The catalogue and the shell, so the store opens and reads with no network.
   Script bodies are cached as they are fetched, so a script you opened once still
   opens offline. */
var CACHE = 'nijatva-store-v1';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png',
             'favicon-32.png', 'favicon-180.png', 'extensions/index.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL).catch(function () { });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // the catalogue is network-first: a stale index is worse than a slow one
  if (url.pathname.indexOf('index.json') >= 0) {
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () { });
      return res;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () { });
        return res;
      });
    }).catch(function () { return caches.match('index.html'); })
  );
});
