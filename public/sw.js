/* Service worker (PRD L14): offline fallback + the last 20 guides you read, available offline.
 * Hand-written, no dependencies. Never touches auth, admin, API, vendor/me pages or non-GET traffic. */
const VERSION = "v1";
const PAGES = `guides-${VERSION}`; // last 20 guide-type pages (LRU)
const STATIC = `static-${VERSION}`; // hashed /_next/static assets (immutable)
const IMAGES = `images-${VERSION}`; // guide cover images
const SHELL = `shell-${VERSION}`; // offline page + icons
const MAX_PAGES = 20;
const MAX_STATIC = 200;
const MAX_IMAGES = 60;
const OFFLINE_URL = "/offline";

const GUIDE_PATH = /^\/(guides\/[a-z0-9-]+\/[a-z0-9-]+|toolkit\/[a-z0-9-]+|blog\/[a-z0-9-]+|safety(\/[a-z0-9-]+)?)\/?$/;
const NEVER = /^\/(admin|api|auth|me|vendor|preview|login|signup|reset|verify)(\/|$)/;

/** Cache the offline page *and* every hashed asset it references, so it can hydrate offline. */
async function precacheShell() {
  const shell = await caches.open(SHELL);
  const res = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await shell.put(OFFLINE_URL, res);
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  const statics = await caches.open(STATIC);
  await Promise.all(assets.map((a) => statics.add(a).catch(() => undefined)));
  await shell.add("/icons/icon-192.png").catch(() => undefined);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(`-${VERSION}`)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys(); // insertion order: oldest first
  for (const req of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(req);
}

/** Network first; keep a fresh copy (moved to most-recent) of guide pages. */
async function guidePage(request) {
  const cache = await caches.open(PAGES);
  const key = new URL(request.url).pathname;
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") {
      await cache.delete(key);
      await cache.put(key, res.clone());
      await trim(PAGES, MAX_PAGES);
    }
    return res;
  } catch {
    return (await cache.match(key)) || offlineRedirect(request);
  }
}

/** Redirect (not serve) to /offline, so the URL matches the page the app router hydrates. */
async function offlineRedirect(request) {
  if (new URL(request.url).pathname === OFFLINE_URL) return (await caches.match(OFFLINE_URL)) || Response.error();
  return Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302);
}

async function otherPage(request) {
  try {
    return await fetch(request);
  } catch {
    return offlineRedirect(request);
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    void trim(cacheName, max);
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.test(url.pathname)) return;
  // RSC payloads for client-side navigation: let them fail offline; Next.js then does a full load.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(GUIDE_PATH.test(url.pathname) && !url.search ? guidePage(request) : otherPage(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC, MAX_STATIC));
    return;
  }
  if (url.pathname === "/_next/image" && request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES).catch(() => Response.error()));
  }
});
