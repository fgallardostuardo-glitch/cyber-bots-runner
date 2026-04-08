const CACHE_NAME = "cyber-bots-vertical-slice-v3";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./game-data.js",
  "./game-systems.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-maskable.svg",
  "./sprites/orion-robot-1.svg",
  "./sprites/orion-robot-2.svg",
  "./sprites/orion-robot-3.svg",
  "./sprites/orion-vehicle-1.svg",
  "./sprites/orion-vehicle-2.svg",
  "./sprites/orion-vehicle-3.svg",
  "./sprites/bee-robot-1.svg",
  "./sprites/bee-robot-2.svg",
  "./sprites/bee-robot-3.svg",
  "./sprites/bee-vehicle-1.svg",
  "./sprites/bee-vehicle-2.svg",
  "./sprites/bee-vehicle-3.svg",
  "./sprites/elita-robot-1.svg",
  "./sprites/elita-robot-2.svg",
  "./sprites/elita-robot-3.svg",
  "./sprites/elita-vehicle-1.svg",
  "./sprites/elita-vehicle-2.svg",
  "./sprites/elita-vehicle-3.svg",
  "./sprites/d16-robot-1.svg",
  "./sprites/d16-robot-2.svg",
  "./sprites/d16-robot-3.svg",
  "./sprites/d16-vehicle-1.svg",
  "./sprites/d16-vehicle-2.svg",
  "./sprites/d16-vehicle-3.svg"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
