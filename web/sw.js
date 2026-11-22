// Network first so new course content shows up as soon as the device is online;
// the cache keeps every module and lab working offline. File list comes from files.js.
importScripts('files.js');
const CACHE = `gnn-lab-${self.COURSE_VERSION}`;
// Scripts are requested with ?v=<version> by index.html, so cache exactly those URLs.
const FILES = [...self.COURSE_SHELL, ...self.COURSE_SCRIPTS.map((src) => `${src}?v=${self.COURSE_VERSION}`)];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gnn-lab-') && k !== CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
    event.respondWith(fetch(request)
        .then((response) => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: false }).then((hit) => hit || caches.match('index.html'))));
});
