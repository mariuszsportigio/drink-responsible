/** Light haptic tick where supported (Android Chrome; iOS ignores silently). */
export function haptic(pattern: number | number[] = 12): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // unsupported — no-op
  }
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Local date as YYYY-MM-DD */
export function dateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateISO: string, delta: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d + delta)
  return dateStr(dt)
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Consecutive-day streak ending today (or yesterday, if today not yet done). */
export function streakOf(doneDates: string[]): number {
  const set = new Set(doneDates)
  let day = dateStr()
  if (!set.has(day)) day = addDays(day, -1)
  let streak = 0
  while (set.has(day)) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}
