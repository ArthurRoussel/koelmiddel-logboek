// Service worker: houdt de app-bestanden bij zodat het logboek ook zonder bereik opent.
// Pagina's: eerst netwerk, anders de bewaarde versie. Gegevens van Supabase gaan nooit via deze cache.
const CACHE = "logboek-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/lektesten/", "/flessen/", "/jaaroverzicht/", "/klanten/", "/installatie/", "/installatie/nieuw/", "/interventie/", "/flessen/nieuw/", "/login/"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const kopie = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("/")))
  );
});
