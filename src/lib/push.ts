import { NTFY_URL, VAPID_PUBLIC_KEY } from './pushConfig'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Subscribe (or reuse) this device's push subscription. Null when unsupported/denied/no SW. */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported() || Notification.permission !== 'granted') return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null // dev mode or SW not ready yet
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  } catch {
    return null
  }
}

export interface SessionSnapshot {
  type: 'state'
  ts: number
  active: boolean
  startedAt?: number
  lastCheckInAt?: number
  checkInMinutes?: number
  subscription?: unknown
}

/** Fire-and-forget publish of session state for the push cron. */
export async function publishSessionState(snapshot: Omit<SessionSnapshot, 'type' | 'ts' | 'subscription'>): Promise<void> {
  try {
    const subscription = await ensurePushSubscription()
    const body: SessionSnapshot = { type: 'state', ts: Date.now(), ...snapshot, subscription: subscription?.toJSON() }
    await fetch(NTFY_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Title: 'state' },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // offline / blocked — in-app check-in modal still covers us
  }
}
