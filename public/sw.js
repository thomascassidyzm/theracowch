const CACHE_NAME = 'cowch-wellness-v148';
// Human-readable build date, surfaced in Settings via the GET_VERSION message
// below so users can confirm at a glance which build they're running.
const BUILD_DATE = '10 Jun 2026';
const urlsToCache = [
  '/',
  '/app.html',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/assets/theracowch_main_image.jpg'
];

// Install event - pre-cache resources. We deliberately do NOT call
// skipWaiting() here: a freshly-installed SW stays in the "waiting" state so
// the page can show a friendly "new version available" banner and only swap
// it in (via the SKIP_WAITING message below) when the user taps to update.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Let the page activate a waiting SW on demand (driven by the update banner
// in app.html). Once we skip waiting, the SW activates, clients.claim() runs,
// and the page reloads on the resulting controllerchange.
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_VERSION') {
    // Reply with the active SW's version + build date so the Settings stamp
    // reflects what's actually controlling the page (not just what's on the
    // server). Answered over the MessageChannel port the page provides.
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: CACHE_NAME, buildDate: BUILD_DATE });
    }
  }
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Handle API calls with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone and cache successful API responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a fallback JSON response for chat API
            return new Response(JSON.stringify({
              response: "I'm currently offline, but I'm still here for you. Please check your connection and try again. 🐄",
              offline: true
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // For navigation requests (HTML pages), bypass HTTP cache and serve
  // offline.html as fallback if the network is unavailable.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For HTML pages requested directly (not via SPA nav), also bypass cache.
  if (event.request.destination === 'document' || event.request.url.match(/\.html(\?|$)/)) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

  // For JS and CSS assets, use network-first so updates take effect immediately
  if (event.request.url.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For all other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all open tabs immediately
  self.clients.claim();

  // Daily reminders are now driven by the page (cowch-reminders-v1 settings)
  // so we no longer auto-schedule 5 mootivations on every activation. The
  // page calls registration.showNotification() at the configured times.
});

// Push notification event
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/apple-touch-icon.png',
      badge: '/icons/icon-96x96.svg',
      tag: 'mootivation',
      requireInteraction: false,
      silent: false,
      data: data.url ? { url: data.url } : {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Note: the old scheduleDailyMootivations() (5 hard-coded notifications/day)
// has been removed. The page now drives gentle, customizable reminders
// (up to two/day, with snooze) — see setupReminders() in /assets/js/app.js
// and the cowch-reminders-v1 localStorage key.