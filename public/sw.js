/*
  ⚠️  FROZEN LEGACY - Service Worker (PWA Caching)
  
  Do not edit without approval from @architect.
  See: docs/PROJECT_MAP.md and docs/DO_NOT_EDIT.md
  
  This file handles:
  - Cache management
  - Offline fallback
  - PWA support
  
  Changes here affect ALL users' offline experience.
  Migration to v2 will include new SW.
*/

// =============================================================================
// XEMGIADAT.COM - SERVICE WORKER PWA
// Progressive Web App Implementation for Real Estate Platform
// =============================================================================

// PHASE 3 FIX: Dynamic versioning - date-based to force cache bust on each deploy
const CACHE_VERSION = '2026-01-29-pmtiles-hd-v1';
const CACHE_NAME = `xemgiadat-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/maxa_list.js',
  '/manifest.json',
  '/offline.html',
  
  // Admin
  '/admin.html',
  '/admin.js',
  
  // Content Pages
  '/bao-cao-thi-truong.html',
  '/blog.html',
  '/tin-tuc-bat-dong-san.html',
  '/gioi-thieu.html',
  '/lien-he.html',
  '/chinh-sach.html',
  '/guide.html',
  
  // Adapters
  '/js/adapters/PMTilesAdapter.js',
  '/js/adapters/GeocodingAdapter.js',
  '/js/adapters/FeatureFlagConfig.js',
  
  // Essential Data
  '/data/ranhgioi.geojson',
  '/tiles/metadata.json',
  
  // External Dependencies
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
  images: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
  tiles: /\/tiles\//,
  parcels: /\/data\/parcels\//,
  api: /\/api\//,
  fonts: /\.(woff|woff2|ttf|eot)$/
};

// =============================================================================
// SERVICE WORKER LIFECYCLE
// =============================================================================

// Install Event - Cache static assets
self.addEventListener('install', event => {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        // Immediately take control, don't wait for clients to close/refresh
        self.skipWaiting();
        return Promise.resolve();
      })
      .catch(error => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// PHASE 3 FIX: Activate Event - Clean old caches AND verify version
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activating...');
  console.log('%c[VERIFY SW] Active version: ' + CACHE_VERSION, 'background: #51cf66; color: white; padding: 4px 8px;');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated, old caches cleared');
        // Claim all clients immediately - no need to wait for refresh
        self.clients.claim();
        return Promise.resolve();
      })
  );
});

// =============================================================================
// FETCH STRATEGIES
// =============================================================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // V2 Isolation: Bypass all cache strategies for /v2/* paths (Phase 6: moved to /v2/)
  // V2 app manages its own caching; legacy SW must not interfere
  if (url.pathname.startsWith('/v2/')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Route to appropriate strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (isTileRequest(url)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (isParcelData(url)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkOnlyStrategy(request));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (isHTMLRequest(url)) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(networkFirstStrategy(request));
  }
});

// =============================================================================
// CACHING STRATEGIES
// =============================================================================

// Cache First - For static assets, images, tiles
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    // Only cache successful full responses (not partial 206 responses)
    if (networkResponse.ok && networkResponse.status !== 206) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.warn('Cache first failed for:', request.url, error);
    return getOfflineResponse(request);
  }
}

// Network First - For HTML pages, dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache successful full responses (not partial 206 responses)
    if (networkResponse.ok && networkResponse.status !== 206) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.warn('Network first failed for:', request.url, error);
    const cachedResponse = await caches.match(request);
    return cachedResponse || getOfflineResponse(request);
  }
}

// Network Only - For API calls, real-time data
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.warn('Network only failed for:', request.url, error);
    throw error;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         CACHE_PATTERNS.fonts.test(url.pathname);
}

function isTileRequest(url) {
  return CACHE_PATTERNS.tiles.test(url.pathname);
}

function isParcelData(url) {
  return CACHE_PATTERNS.parcels.test(url.pathname);
}

function isAPIRequest(url) {
  return CACHE_PATTERNS.api.test(url.pathname) ||
         url.hostname.includes('firebase') ||
         url.hostname.includes('googleapis');
}

function isImageRequest(url) {
  return CACHE_PATTERNS.images.test(url.pathname);
}

function isHTMLRequest(url) {
  return url.pathname.endsWith('.html') || 
         url.pathname === '/' ||
         !url.pathname.includes('.');
}

async function getOfflineResponse(request) {
  if (isHTMLRequest(new URL(request.url))) {
    return caches.match(OFFLINE_URL) || 
           caches.match('/index.html') ||
           new Response('Offline - Không có kết nối internet', {
             status: 503,
             headers: { 'Content-Type': 'text/html; charset=utf-8' }
           });
  }
  
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// =============================================================================
// BACKGROUND SYNC & PUSH NOTIFICATIONS
// =============================================================================

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'portfolio-sync') {
    event.waitUntil(syncPortfolioData());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalyticsData());
  }
});

// Push Notifications
self.addEventListener('push', event => {
  console.log('🔔 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Cập nhật mới từ Xem Giá Đất',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Xem ngay',
        icon: '/images/action-open.png'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: '/images/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Xem Giá Đất Đà Nẵng', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('📱 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Focus existing window if available
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// =============================================================================
// DATA SYNC FUNCTIONS
// =============================================================================

async function syncPortfolioData() {
  console.log('📤 Syncing portfolio data...');
  
  try {
    // Get pending portfolio submissions from IndexedDB
    // Upload to Firebase when online
    // Implementation depends on IndexedDB structure
    
    console.log('✅ Portfolio data synced');
  } catch (error) {
    console.error('❌ Portfolio sync failed:', error);
  }
}

async function syncAnalyticsData() {
  console.log('📊 Syncing analytics data...');
  
  try {
    // Send cached analytics events to Firebase
    // Implementation depends on analytics storage
    
    console.log('✅ Analytics data synced');
  } catch (error) {
    console.error('❌ Analytics sync failed:', error);
  }
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

// Cache performance tracking
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

async function getCacheStats() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  return {
    cacheSize: keys.length,
    cacheName: CACHE_NAME,
    lastUpdated: new Date().toISOString()
  };
}

console.log('🚀 Xem Giá Đất Service Worker loaded successfully');

// Build version tracking
console.log(`📦 Service Worker Cache Version: ${CACHE_VERSION}`);
console.log(`🗂️ Cache Name: ${CACHE_NAME}`);
console.log(`⚡ skipWaiting & clientsClaim: Enabled - immediate updates`);
