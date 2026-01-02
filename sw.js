
const APP_VERSION = 'v5'; // TEK KAYNAK: Sadece burayı değiştirmen yeterli.
const CACHE_NAME = `matrixc-app-${APP_VERSION}`; 
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache files
self.addEventListener('install', (event) => {
  // Yeni SW yüklendiği an bekleme yapmadan aktif olmaya zorla
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  // Aktif olur olmaz tüm sekmelerin kontrolünü ele al
  event.waitUntil(clients.claim());

  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Eski versiyon cache'lerini sil
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Strategy: Network First for HTML, Stale-While-Revalidate for Assets
self.addEventListener('fetch', (event) => {
  // API isteklerini cacheleme
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // HTML istekleri için (Sayfa navigasyonu) -> Önce Ağa git, yoksa Cache'e bak
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Diğer statik dosyalar -> Önce Cache, sonra Ağ
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// React uygulamasından gelen "Versiyon kaç?" sorusuna cevap ver
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    // Mesajı gönderen kaynağa (client) versiyonu geri dön
    if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: APP_VERSION });
    }
  }
});
