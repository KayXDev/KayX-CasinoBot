// Service Worker para notificaciones push
self.addEventListener('push', function(event) {
  const options = {
    body: 'Tienes nuevas notificaciones del Casino Bot',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'casino-notification',
    data: {
      url: '/notifications'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver notificación',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar',
        icon: '/icons/dismiss.png'
      }
    ]
  }

  if (event.data) {
    const data = event.data.json()
    options.body = data.message
    options.data.url = data.link || '/notifications'
  }

  event.waitUntil(
    self.registration.showNotification('Casino Bot', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})