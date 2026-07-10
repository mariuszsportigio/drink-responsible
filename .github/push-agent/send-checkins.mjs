// Runs on a GitHub Actions cron. Reads session-state snapshots the PWA publishes
// to an ntfy.sh topic and sends a Web Push check-in reminder when one is due.
import webpush from 'web-push'

const { NTFY_TOPIC, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT = 'mailto:m.zwierzychowski@gmail.com' } = process.env
if (!NTFY_TOPIC || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing NTFY_TOPIC / VAPID_* env')
  process.exit(1)
}

const MAX_SESSION_HOURS = 16 // ignore sessions the user forgot to close
const EARLY_TOLERANCE_MS = 3 * 60_000

const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/json?poll=1&since=24h`)
if (!res.ok) {
  console.error('ntfy poll failed:', res.status)
  process.exit(1)
}
const text = await res.text()
const events = text
  .split('\n')
  .filter(Boolean)
  .map((l) => { try { return JSON.parse(l) } catch { return null } })
  .filter((l) => l && l.event === 'message')
  .map((l) => { try { return JSON.parse(l.message) } catch { return null } })
  .filter(Boolean)

const states = events.filter((e) => e.type === 'state').sort((a, b) => a.ts - b.ts)
const latest = states[states.length - 1]
if (!latest) { console.log('no state in window'); process.exit(0) }
if (!latest.active) { console.log('no active session'); process.exit(0) }
if (Date.now() - latest.startedAt > MAX_SESSION_HOURS * 3_600_000) { console.log('session stale, ignoring'); process.exit(0) }

const notifiedTs = events.filter((e) => e.type === 'notified').map((e) => e.ts)
const anchor = Math.max(latest.lastCheckInAt ?? latest.startedAt, ...notifiedTs, 0)
const intervalMs = (latest.checkInMinutes ?? 60) * 60_000
const dueIn = anchor + intervalMs - Date.now()
if (dueIn > EARLY_TOLERANCE_MS) {
  console.log(`not due yet (in ${Math.round(dueIn / 60000)} min)`)
  process.exit(0)
}

// push to every subscription seen in the window (phone + laptop), deduped by endpoint
const subs = new Map()
for (const e of states) {
  if (e.subscription?.endpoint) subs.set(e.subscription.endpoint, e.subscription)
}
if (subs.size === 0) { console.log('active session but no subscriptions'); process.exit(0) }

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
const payload = JSON.stringify({
  title: '⏰ Check-in formy',
  body: 'Godzina minęła: szybka gierka + spowiedź z drinków i wody. 🍺💧',
})

let sent = 0
for (const sub of subs.values()) {
  try {
    await webpush.sendNotification(sub, payload, { TTL: 1800, urgency: 'high' })
    sent++
  } catch (err) {
    console.error('push failed:', err.statusCode ?? err.message)
  }
}
console.log(`sent ${sent}/${subs.size} pushes`)

if (sent > 0) {
  await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    body: JSON.stringify({ type: 'notified', ts: Date.now() }),
    headers: { Title: 'notified' },
  })
}
