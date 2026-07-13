self.addEventListener("install", (_event) => {
  console.log("Service Worker installed.");
  self.skipWaiting();
});

self.addEventListener("activate", (_event) => {
  console.log("Service Worker activated.");
  self.clients.claim();
});

self.addEventListener("fetch", (_event) => {
  // We can add caching logic here in the future
});
