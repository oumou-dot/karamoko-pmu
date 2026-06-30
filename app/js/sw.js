/* ============================================
   KARAMOKO PMU PRO - Service Worker
   Mode hors ligne (PWA)
   ============================================ */

const CACHE_NAME = 'karamoko-pmu-v2';
// sw.js est enregistré depuis app/js/sw.js : les chemins relatifs ci-dessous
// sont résolus par rapport à ce fichier.
const STATIC_ASSETS = [
  '../index.html',
  '../css/main.css',
  '../css/components.css',
  './app.js',
  './core/engine.js',
  './core/methodes.js',
  './core/combinator.js',
  './core/validator.js',
  './parsers/pdf-parser.js',
  './parsers/manual-entry.js',
  './storage/db.js',
  './storage/exporter.js',
  './storage/backup.js',
  './ui/renderer.js',
  './ui/methodes-renderer.js',
  './ui/charts.js',
  './ui/modals.js',
  '../data/hippodromes.json'
];

// ---------- INSTALLATION ----------
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Assets mis en cache avec succès');
        return self.skipWaiting(); // Activer immédiatement
      })
      .catch((err) => {
        console.error('[SW] Erreur de mise en cache:', err);
      })
  );
});

// ---------- ACTIVATION ----------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Suppression ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activé');
        return self.clients.claim(); // Prendre contrôle immédiatement
      })
  );
});

// ---------- FETCH (stratégie Cache-First) ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes Chrome extensions
  if (request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Si trouvé en cache → retourner
        if (cachedResponse) {
          return cachedResponse;
        }

        // Sinon → fetch réseau
        return fetch(request)
          .then((networkResponse) => {
            // Ne pas mettre en cache les réponses non-valide
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Mettre en cache la réponse réseau
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Si hors ligne et pas en cache → page d'erreur personnalisée
            if (request.destination === 'document') {
              return caches.match('../index.html');
            }
            // Sinon erreur silencieuse
            return new Response('Hors ligne', { status: 503 });
          });
      })
  );
});

// ---------- MESSAGES (communication avec l'app) ----------
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'getVersion') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
