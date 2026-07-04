import {
  precacheAndRoute,
  createHandlerBoundToURL,
  registerRoute,
  setCatchHandler,
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  warmStrategyCache,
} from "serwist";

// Precache all assets built by Next.js
precacheAndRoute(self.__WB_MANIFEST || []);

// Warm the cache with critical resources
warmStrategyCache({
  urls: ["/ar", "/en", "/logo.png", "/favicon.svg"],
  strategy: new CacheFirst({
    cacheName: "ibn-al-azhar-docs-shell",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  }),
});

// App Shell — Cache First
const shellStrategy = new CacheFirst({
  cacheName: "ibn-al-azhar-docs-shell",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60,
    }),
  ],
});

registerRoute(({ request }) => request.mode === "navigate", shellStrategy);

// API GET — Network First (fallback to cache)
const apiStrategy = new NetworkFirst({
  cacheName: "ibn-al-azhar-docs-api",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 5 * 60, // 5 minutes
    }),
  ],
});

registerRoute(({ url, request }) => {
  return url.pathname.startsWith("/api/") && request.method === "GET";
}, apiStrategy);

// Images — Stale While Revalidate
const imageStrategy = new StaleWhileRevalidate({
  cacheName: "ibn-al-azhar-docs-images",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
    }),
  ],
});

registerRoute(({ request }) => request.destination === "image", imageStrategy);

// Fonts — Cache First
const fontStrategy = new CacheFirst({
  cacheName: "ibn-al-azhar-docs-fonts",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    }),
  ],
});

registerRoute(({ request }) => request.destination === "font", fontStrategy);

// Offline fallback
setCatchHandler(async ({ event }) => {
  if ((event as FetchEvent).request?.destination === "document") {
    return caches.match("/ar/offline") || Response.error();
  }
  return Response.error();
});
