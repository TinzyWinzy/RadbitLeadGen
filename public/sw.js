/**
 * Tourism Intelligence OS - Progressive Web App Service Worker
 * Robust offline-first asset caching & dynamic network routing.
 */

const CACHE_NAME = "tourism-intelligence-cache-v1";

// Essential core files to cache on startup
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/app_icon.jpg",
  "/manifest.json"
];

// Install event: cache initial assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching core application shell");
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Force immediate activation
      return self.skipWaiting();
    })
  );
});

// Activate event: clean up stale older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing obsolete cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Gain control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event: handle offline-first caching and dynamic network integration
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Bypass Service Worker cache for Firestore SDK, Firebase Auth, and API requests
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("firebase") ||
    request.method !== "GET"
  ) {
    // Let these go directly to the network without caching
    return;
  }

  // 2. Navigation requests: Network-First (with offline cache fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the latest copy of index.html
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });
          return response;
        })
        .catch(() => {
          // If offline, retrieve from cache
          return caches.match("/index.html") || caches.match(request);
        })
    );
    return;
  }

  // 3. Static Assets & Third-party assets (CSS, JS, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh asset in the background and update cache, but serve cached immediately
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore background fetch errors (e.g. when offline)
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Safe offline placeholder for missing images or assets
        if (request.headers.get("accept").includes("image")) {
          return caches.match("/app_icon.jpg");
        }
      });
    })
  );
});
