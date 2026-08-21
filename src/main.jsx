import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// PWA Auto-Update Handler: Checks for updates on every app launch and focus
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for updates immediately on launch
      registration.update()

      // Check for updates when PWA is resumed/focused
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update()
        }
      })

      // When a new version is detected and activated, refresh to load latest build
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available, reload immediately
              window.location.reload()
            }
          })
        }
      })
    }).catch((err) => {
      console.log('SW registration error:', err)
    })
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
