/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

// prompt-mode updates: the page shows a toast and posts SKIP_WAITING when the user accepts
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)))

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? '⏰ Check-in formy', {
      body: data.body ?? 'Szybka gierka + spowiedź: co doszło przez ostatnią godzinę?',
      icon: `${import.meta.env.BASE_URL}pwa-192.png`,
      badge: `${import.meta.env.BASE_URL}pwa-192.png`,
      tag: 'drink-checkin',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(self.registration.scope)
    }),
  )
})
