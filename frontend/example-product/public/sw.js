/// <reference lib="webworker" />

/**
 * PAY.ID Service Worker — Push Notifications
 * 
 * Listens for payment events and shows push notifications.
 */

const CACHE_NAME = 'payid-v1'

self.addEventListener('install', (event) => {
  console.log('[SW] PAY.ID Service Worker installed')
  // @ts-ignore
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] PAY.ID Service Worker activated')
  // @ts-ignore
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  // @ts-ignore
  const data = event.data?.json() ?? {}
  
  const title = data.title || 'PAY.ID Notification'
  const body = data.body || 'You have a new payment update.'
  const icon = data.icon || '/favicon.ico'
  const url = data.url || '/'

  const options = {
    body,
    icon,
    badge: '/favicon.ico',
    tag: data.tag || 'payid-default',
    data: { url },
    requireInteraction: false,
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  // @ts-ignore
  event.waitUntil(
    // @ts-ignore
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  // @ts-ignore
  event.notification.close()
  // @ts-ignore
  const url = event.notification.data?.url || '/'

  // @ts-ignore
  event.waitUntil(
    // @ts-ignore
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // @ts-ignore
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // @ts-ignore
      if (self.clients.openWindow) {
        // @ts-ignore
        return self.clients.openWindow(url)
      }
    })
  )
})
