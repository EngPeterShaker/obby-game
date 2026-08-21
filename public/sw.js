const CACHE_NAME = 'obby-pwa-v1'

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for previous instances to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Always use Network-First for HTML navigation so launching PWA immediately fetches the latest version
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone())
            return networkResponse
          })
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Network-first with cache fallback for assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
