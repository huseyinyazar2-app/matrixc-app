
// MatrixC Service Worker - Version v8
// Bu dosya içeriği değiştiğinde tarayıcı SW'yi günceller.

// Versiyon dosyasını içe aktar (MatrixC_Version değişkeni gelir)
importScripts('version.js');

const CACHE_NAME = `matrixc-app-${MatrixC_Version}`; 
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.js'
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
            console.log('Deleting old cache:', cacheName);
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
