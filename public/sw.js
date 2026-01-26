
const CACHE_NAME = 'doodledream-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin static assets
  if (event.request.method !== 'GET') return;

  // Bypass Supabase auth entirely (avoid SW interference)
  if (event.request.url.includes('supabase.co/auth')) return;

  const url = new URL(event.request.url);

  // Don't intercept API calls or external requests
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
