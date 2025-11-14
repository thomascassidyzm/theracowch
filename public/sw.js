const CACHE_NAME = 'cowch-wellness-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/theracowch_main_image.jpg',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js',
  'https://cdn.tailwindcss.com'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
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
  
  // Start the daily mootivation scheduler
  scheduleDailyMootivations();
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

// Daily Mootivations Scheduler
function scheduleDailyMootivations() {
  // Schedule random mootivations throughout the day
  const mootivations = [
    {
      title: "🐄 Moo-rning Check-in",
      body: "Just wanted you to know - you're doing vache-tastic! Ready for a wonderful day on the cowch? 💝",
      time: { hour: 9, minute: 0 }
    },
    {
      title: "🏖️ Midday Vaca-tion", 
      body: "Time for a quick mental vaca-tion! Your feelings are valid, and you deserve this moment of support. I'm here whenever you need me!",
      time: { hour: 14, minute: 30 }
    },
    {
      title: "🌙 Evening Encouragement",
      body: "You've survived another day, and that's incroy-a-bull to be proud of! Sweet dreams! 🐄",
      time: { hour: 20, minute: 0 }
    },
    {
      title: "💝 Gentle Reminder",
      body: "Moo-gress, not perfection, is the goal. You're doing better than you think! Kuh-nderbar! 🌈",
      time: { hour: 16, minute: 15 }
    },
    {
      title: "🤗 Cowch Vaca-tion Check-in",
      body: "Ready for a mini mental vaca-tion? Just like a loyal pet, I'm always here for you. How are you feeling today? 💙",
      time: { hour: 11, minute: 45 }
    }
  ];

  // Set up notifications for each mootivation
  mootivations.forEach((moot, index) => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(moot.time.hour, moot.time.minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const delay = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      // Set up recurring notification
      setInterval(() => {
        self.registration.showNotification(moot.title, {
          body: moot.body,
          icon: '/apple-touch-icon.png',
          badge: '/icons/icon-96x96.svg',
          tag: `daily-moot-${index}`,
          requireInteraction: false
        });
      }, 24 * 60 * 60 * 1000); // Repeat every 24 hours
      
      // Show first notification
      self.registration.showNotification(moot.title, {
        body: moot.body,
        icon: '/apple-touch-icon.png',
        badge: '/icons/icon-96x96.svg',
        tag: `daily-moot-${index}`,
        requireInteraction: false
      });
    }, delay);
  });
}