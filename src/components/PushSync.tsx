import { useEffect, useRef } from 'react'
import { useAppState } from '../state/store'
import { publishSessionState } from '../lib/push'

/**
 * Publishes a session-state snapshot (with this device's push subscription)
 * whenever the session starts/ends or a check-in lands, so the push cron
 * knows when the next check-in notification is due.
 */
export function PushSync() {
  const state = useAppState()
  const session = state.activeSession
  const lastCheckTs = session?.checkIns[session.checkIns.length - 1]?.ts
  const publishedInactive = useRef(false)

  useEffect(() => {
    if (!state.settings.notificationsEnabled) return
    if (session) {
      publishedInactive.current = false
      void publishSessionState({
        active: true,
        startedAt: session.startedAt,
        lastCheckInAt: lastCheckTs ?? session.startedAt,
        checkInMinutes: state.settings.checkInMinutes,
      })
    } else if (!publishedInactive.current) {
      publishedInactive.current = true
      void publishSessionState({ active: false })
    }
  }, [session?.id, lastCheckTs, state.settings.notificationsEnabled, state.settings.checkInMinutes])

  return null
}
