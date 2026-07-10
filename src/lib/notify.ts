export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function ensureNotifyPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Local notification. Prefers the service worker (works for installed PWA,
 * required on Android), falls back to the Notification constructor.
 * Note: without a push server, notifications fire only while the app process
 * is alive (open tab or installed PWA in foreground/background-recent).
 */
export async function notify(title: string, body: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}pwa-192.png`,
        badge: `${import.meta.env.BASE_URL}pwa-192.png`,
        tag: 'drink-checkin',
      })
      return
    }
  } catch {
    // fall through to constructor
  }
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}pwa-192.png` })
  } catch {
    // notifications unavailable (e.g. iOS Safari tab) — in-app modal still shows
  }
}
