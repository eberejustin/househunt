// Service Worker for HouseHunt PWA
const CACHE_NAME = 'househunt-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Always use network-first strategy to prevent aggressive caching
const useNetworkFirst = true;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback (or network-first in development)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Use network-first strategy to prevent aggressive caching
  if (useNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache to avoid stale content
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page for navigation requests
              if (event.request.mode === 'navigate') {
                return caches.match('/');
              }
            });
        })
    );
  } else {
    // Use cache-first strategy (currently disabled)
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached version if available
          if (cachedResponse) {
            return cachedResponse;
          }

          // Otherwise fetch from network
          return fetch(event.request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone response for caching
              const responseToCache = response.clone();

              // Cache the response for future use
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // Return offline page for navigation requests
              if (event.request.mode === 'navigate') {
                return caches.match('/');
              }
            });
        })
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'You have a new notification from HouseHunt',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'househunt-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ]
  };

  let notificationData = {
    title: 'HouseHunt',
    ...options
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || 'HouseHunt',
        body: pushData.message || pushData.body,
        icon: pushData.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: pushData.tag || 'househunt-notification',
        data: pushData,
        requireInteraction: pushData.requireInteraction || false,
        actions: pushData.actions || options.actions
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Determine URL to open
  let urlToOpen = '/';
  
  if (action === 'view' && notificationData && notificationData.apartmentId) {
    urlToOpen = `/?apartment=${notificationData.apartmentId}`;
  } else if (notificationData && notificationData.url) {
    urlToOpen = notificationData.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'notification-click',
              data: notificationData,
              action: action
            });
            return;
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'apartment-sync') {
    event.waitUntil(
      // Handle offline apartment submissions
      syncOfflineData()
    );
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // Get offline data from IndexedDB or localStorage
    const offlineData = await getOfflineData();
    
    if (offlineData && offlineData.length > 0) {
      for (const item of offlineData) {
        try {
          // Attempt to sync each item
          await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          });
          
          // Remove successfully synced item
          await removeOfflineItem(item.id);
        } catch (error) {
          console.error('Failed to sync item:', error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineItem(id) {
  // Remove item from offline storage
  console.log('Removing offline item:', id);
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});