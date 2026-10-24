/**
 * Service worker for the installed app.
 *
 * The rule that matters in a shop: money figures must never come from a
 * cache. Dues, stock and sales change by the minute, and a cashier shown a
 * stale due would take the wrong amount. So anything under /api is always
 * fetched from the network and never stored.
 *
 * What is safe to cache is the shell — the built JS and CSS, the icons, the
 * fonts. Those are content-hashed, so a cached copy is either current or
 * replaced by a new URL.
 */

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const OFFLINE = "/offline.html";

// Built assets carry a hash in the name, so they can be kept as they are
const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname);

const isApi = (url) => url.pathname.startsWith("/api/");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll([OFFLINE])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => !name.endsWith(VERSION)).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // only plain GETs are ever cacheable
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // another origin's request is none of our business
  if (url.origin !== self.location.origin) return;

  // never serve a figure from yesterday
  if (isApi(url)) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: the network decides, the cache is only there for a dead connection
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE))),
    );
  }
});
