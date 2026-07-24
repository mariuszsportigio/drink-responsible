const EVT = 'drink-tracker/force-checkin'

/** One-tap challenge: ask CheckInManager to start the full check-in flow right now, skipping the prompt. */
export function requestCheckIn() {
  window.dispatchEvent(new Event(EVT))
}

export function onCheckInRequest(fn: () => void): () => void {
  window.addEventListener(EVT, fn)
  return () => window.removeEventListener(EVT, fn)
}
