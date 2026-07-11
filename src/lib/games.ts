import type { Baseline, GameKind } from './types'

export const GAME_META: Record<GameKind, { name: string; icon: string; unit: string; lowerIsBetter: boolean; describe: (v: number) => string }> = {
  reflex: {
    name: 'Refleks',
    icon: '⚡',
    unit: 'ms',
    lowerIsBetter: true,
    describe: (v) => `${Math.round(v)} ms`,
  },
  trace: {
    name: 'Percepcja',
    icon: '🔢',
    unit: 's',
    lowerIsBetter: true,
    describe: (v) => `${(v / 1000).toFixed(1)} s`,
  },
  memory: {
    name: 'Pamięć',
    icon: '🧠',
    unit: 'sekw.',
    lowerIsBetter: false,
    describe: (v) => `${Math.round(v)} sekw.`,
  },
}

export const GAME_KINDS: GameKind[] = ['reflex', 'trace', 'memory']

/** Compare a session score against baseline → form %, capped 0–125. */
export function formPct(kind: GameKind, value: number, baseline: Baseline): number | undefined {
  const base = baseline[kind]
  if (!base || base <= 0) return undefined
  // lower-is-better (reflex) divides by value — a 0 there is a broken measurement, not a score
  if (GAME_META[kind].lowerIsBetter && value <= 0) return undefined
  const pct = GAME_META[kind].lowerIsBetter ? (base / value) * 100 : (value / base) * 100
  return Math.round(Math.min(125, Math.max(0, pct)))
}

export function randomGame(): GameKind {
  return GAME_KINDS[Math.floor(Math.random() * GAME_KINDS.length)]
}

export function baselineComplete(b: Baseline): boolean {
  return b.reflex != null && b.trace != null && b.memory != null
}

export const BASELINE_REFRESH_DAYS = 30

export function baselineStale(b: Baseline): boolean {
  if (!b.calibratedAt) return true
  return Date.now() - b.calibratedAt > BASELINE_REFRESH_DAYS * 24 * 3_600_000
}
