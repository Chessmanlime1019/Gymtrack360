/* Service worker de GYMTRACK 360.
   - Navegación: red primero; si no hay conexión, muestra la última página guardada o /offline.html.
   - Archivos propios (JS, CSS, fuentes, iconos): se sirven del caché y se actualizan en segundo plano.
   - Nunca guarda nada de otros dominios (Supabase, etc.): los datos siempre vienen en vivo. */
const VERSION = "gt360-v1";
const SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y demás: sin caché

  // Páginas
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copia));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || caches.match("/offline.html")))
    );
    return;
  }

  // Archivos estáticos: caché primero, y se refresca en segundo plano
  event.respondWith(
    caches.match(req).then((enCache) => {
      const red = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => enCache);
      return enCache || red;
    })
  );
});