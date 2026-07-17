const CACHE_NAME = 'classroom-suite-v2-cache-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/services/DataStore.js',
    './src/services/CanvasEngine.js',
    './src/components/PeriodControls.js',
    './src/components/PeriodAssignment.js',
    './src/components/StudentRegistry.js',
    './src/components/StudentControls.js',
    './src/components/LayoutCanvas.js',
    './src/components/LayoutMenu.js',
    './src/components/LayoutControls.js',
    './src/components/RoomControls.js',
    './src/components/RoomMenu.js',
	'./icon-192.png',
    './icon-512.png',
	// Add the new local libraries
    './lib/tailwindcss.js',
    './lib/vue.global.js',
    './lib/fabric.min.js',
    './lib/jspdf.umd.min.js',
    './lib/default.css',
    './lib/mobile-drag-drop.min.js'
];

// Step 1: Install the service worker and cache the core files
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Step 2: Clean up old caches if we update the version number
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Step 3: Network-First Strategy (Great for active development)
self.addEventListener('fetch', (event) => {
    // Only intercept local requests, ignore CDNs like Tailwind/Vue/Fabric
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If the network succeeds, save a fresh copy to the cache
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // If the network fails (offline), serve the cached version
                return caches.match(event.request);
            })
    );
});