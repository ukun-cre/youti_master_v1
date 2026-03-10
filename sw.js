/* ==========================================
   ようちえん まなびランド - sw.js
   統合Service Worker（全サブアプリをキャッシュ）
   ========================================== */

const CACHE_NAME = 'manabiland-v1';

// キャッシュするアセット一覧
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './hub.js',
  './manifest.json',
  // 漢字アプリ
  './apps/kanji/index.html',
  './apps/kanji/style.css',
  './apps/kanji/app.js',
  // 計算アプリ
  './apps/math/index.html',
  './apps/math/style.css',
  './apps/math/app.js',
  // 10の組み合わせアプリ
  './apps/juucombo/index.html',
  './apps/juucombo/style.css',
  './apps/juucombo/app.js',
  // Googleフォント（キャッシュ試行）
  'https://fonts.googleapis.com/css2?family=Kosugi+Maru&family=Noto+Sans+JP:wght@400;700;900&display=swap',
];

/* Install: 全アセットをキャッシュ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(
        ASSETS.filter(url => {
          try { new URL(url, self.location.href); return true; } catch { return false; }
        })
      ))
      .then(() => self.skipWaiting())
  );
});

/* Activate: 古いキャッシュを削除 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch: キャッシュファースト戦略 */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
