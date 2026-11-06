// Service worker: guarda o app no celular para funcionar sem internet.
// Ao publicar uma versão nova, mude o número abaixo (e APP_VERSION no app.js).
const CACHE = 'rapport-v1.0.1';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'i18n.js', 'forms.js', 'pdf-lib.min.js', 'manifest.webmanifest',
  'forms/blank_en.pdf', 'forms/blank_de.pdf', 'forms/blank_es.pdf', 'forms/bg_en.png', 'forms/bg_de.png', 'forms/bg_es.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
