/* eslint-disable no-restricted-globals */
/**
 * Service worker.
 *
 * create-react-app compiles this file with Workbox's `InjectManifest` plugin
 * whenever `src/service-worker.js` exists, which is why it is plain JavaScript
 * and sits here rather than under `src/lib`.
 *
 * Two jobs, matching PLAN 4.8:
 *
 *   1. Cache the app shell so a cold start is instant and works offline.
 *   2. Cache weather API responses stale-while-revalidate, so the last
 *      forecast survives a reload with no connection. IndexedDB already holds
 *      the parsed model (see `lib/db.ts`); this is the transport-level layer
 *      underneath it, which also covers a first load that fails before the
 *      app has had a chance to run.
 *
 * Deliberately NOT included: `workbox-google-analytics`. It is deprecated and
 * incompatible with GA4, and this project has no analytics to begin with.
 */

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";

clientsClaim();

/*
 * `skipWaiting` is deliberately NOT called on install. A new worker that
 * activates immediately would swap the cached assets out from under a page the
 * user is already using, which for a weather app means a reload they did not
 * ask for. Instead the worker waits, the app raises a prompt, and only then
 * does it take over. The other half of this lives in
 * `serviceWorkerRegistration.ts`.
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ------------------------------------------------------------- app shell */

// __WB_MANIFEST is replaced at build time with the hashed asset list.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/*
 * Every in-app navigation resolves to index.html, because this is a
 * single-page app with no server to render routes.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    // The Workbox CDN and the API hosts should never receive index.html.
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  })
);

/* --------------------------------------------------------------- basemap */

/**
 * Map tiles are immutable — a given z/x/y for a given timestamp never changes —
 * so they are cached first and never revalidated. The cap matters: an
 * unbounded tile cache is how a service worker quietly consumes hundreds of
 * megabytes.
 */
registerRoute(
  ({ url }) =>
    url.hostname.endsWith("basemaps.cartocdn.com") ||
    url.hostname.endsWith("tilecache.rainviewer.com"),
  new CacheFirst({
    cacheName: "map-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 24 * 60 * 60,
        // The map fires a burst of tile requests when it opens; without this
        // Workbox warns about unbounded concurrent cache writes.
        purgeOnQuotaError: true,
      }),
    ],
  })
);

/* ------------------------------------------------------------------ APIs */

/**
 * Stale-while-revalidate: serve the cached forecast instantly and refresh it in
 * the background. This is what makes a reload with a poor connection feel
 * immediate while still ending up current.
 */
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    (url.hostname.endsWith("open-meteo.com") ||
      url.hostname.endsWith("bigdatacloud.net") ||
      url.hostname.endsWith("rainviewer.com")),
  new StaleWhileRevalidate({
    cacheName: "weather-api",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 12 * 60 * 60,
      }),
    ],
  })
);

/**
 * Place search gets its own cache with a longer life: the answer for "Kathmu"
 * does not change, and a stale suggestion list beats an empty one offline.
 */
registerRoute(
  ({ url }) => url.hostname.endsWith("geocoding-api.open-meteo.com"),
  new NetworkFirst({
    cacheName: "geocoding",
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

/* -------------------------------------------------------- notifications */

/**
 * Focuses an existing tab rather than opening a second one when a
 * notification is clicked. Falls back to opening a new window when the app is
 * not running.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "notification-click" });
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
