/**
 * Web Push wiring (no own backend):
 * - the app publishes session-state snapshots to a public ntfy.sh topic (free pub/sub inbox),
 * - a GitHub Actions cron polls that topic and sends real Web Push (VAPID) when a check-in is due.
 * The topic name is a long random secret-by-obscurity — knowing it only lets someone see
 * session timestamps / trigger a nag notification, never read app data or push anything else.
 */
export const NTFY_TOPIC = 'drink-resp-d14a3c9ccd1a0c91e7ada3184aff736f'
export const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`
export const VAPID_PUBLIC_KEY =
  'BA3LtWganiIU7aVX83oCYtMoIj3BEsYK0Dv3Hu2IG-mKWFNG_E88uc8eHIzGQzcBA5uZ2aaWpQ7debcTzSZaUtc'
