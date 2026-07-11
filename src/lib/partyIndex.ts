import type { DrinkSession, Profile } from './types'
import { estimatePermille, isStrong, totalUnits, waterDeficit } from './alcohol'

/**
 * Party Index — one human-calibrated cockpit number.
 * 100 = sober, hydrated, fed, tests at baseline. Calibration anchors (80 kg):
 * 4 beers over ~3h with water+food ≈ high 80s ("idealna dawka"),
 * 8 beers over ~7h ≈ low 70s ("max imprezy, ale na luzie"),
 * ~1.0‰ ≈ low 70s (still fine, watch it), 1.5‰+ = warning zone.
 * Strong alcohol (shots) in the last hour costs extra — it lands faster than it feels.
 */
export interface IndexInput {
  permille: number
  /** latest check-in form % vs baseline */
  lastForm?: number
  waterDeficit: number
  /** a proper meal within the last ~3.5h */
  fedRecently: boolean
  /** units of strong (≥30%) alcohol in the last hour */
  strongRecentUnits: number
  units: number
}

export function partyIndex(i: IndexInput): number {
  let x = 100
  const p = i.permille
  if (p <= 0.3) x -= p * 10
  else if (p <= 0.7) x -= 3 + (p - 0.3) * 25
  else if (p <= 1.2) x -= 13 + (p - 0.7) * 50
  else if (p <= 1.8) x -= 38 + (p - 1.2) * 65
  else x -= 77 + (p - 1.8) * 40

  if (i.lastForm != null && i.lastForm < 100) x -= Math.min(20, (100 - i.lastForm) * 0.35)
  x -= Math.min(15, i.waterDeficit * 5)
  if (!i.fedRecently && i.units > 2) x -= 8
  x -= Math.min(12, i.strongRecentUnits * 4)

  return Math.round(Math.max(0, Math.min(100, x)))
}

export type IndexZone = 'clean' | 'ideal' | 'good' | 'edge' | 'high' | 'critical'

export function indexZone(index: number, units: number): IndexZone {
  if (units <= 0) return 'clean'
  if (index >= 80) return 'ideal'
  if (index >= 65) return 'good'
  if (index >= 50) return 'edge'
  if (index >= 35) return 'high'
  return 'critical'
}

export const ZONE_LABEL: Record<IndexZone, string> = {
  clean: 'czysto',
  ideal: 'idealna strefa',
  good: 'dobra zabawa',
  edge: 'granica',
  high: 'przegięcie',
  critical: 'stop',
}

export function indexColor(index: number): string {
  if (index >= 80) return '#34D399'
  if (index >= 65) return '#7DD3FC'
  if (index >= 50) return '#F5A524'
  if (index >= 35) return '#FB923C'
  return '#F87171'
}

/** Session-state pieces the index needs, computed at time `at`. */
export function sessionIndexInput(session: DrinkSession, profile: Profile, at: number): IndexInput {
  const units = totalUnits(session.drinks.filter((d) => d.ts <= at))
  const water = session.water.filter((w) => w.ts <= at).length
  const meals = (session.food ?? []).filter((f) => f.ts <= at)
  const fedRecently = meals.some((f) => f.kind === 'meal' && at - f.ts < 3.5 * 3_600_000)
  const strongRecentUnits = session.drinks
    .filter((d) => isStrong(d.abv) && at - d.ts < 3_600_000 && d.ts <= at)
    .reduce((s, d) => s + d.units, 0)
  const checksBefore = session.checkIns.filter((c) => c.ts <= at)
  const lastForm = checksBefore[checksBefore.length - 1]?.formPct
  return {
    permille: estimatePermille(session.drinks.filter((d) => d.ts <= at), profile, at),
    lastForm,
    waterDeficit: waterDeficit(units, water),
    fedRecently,
    strongRecentUnits,
    units,
  }
}

/** Lowest index over the session (sampled) — the "worst moment" that goes into history. */
export function sessionWorstIndex(session: DrinkSession, profile: Profile): number {
  if (session.drinks.length === 0) return 100
  const start = session.startedAt
  const end = session.endedAt ?? Date.now()
  const SAMPLES = 24
  let worst = 100
  for (let i = 0; i <= SAMPLES; i++) {
    const at = start + ((end - start) * i) / SAMPLES
    worst = Math.min(worst, partyIndex(sessionIndexInput(session, profile, at)))
  }
  return worst
}

/** Day quality for the calendar: how a whole day should be painted. */
export type DayQuality = 'none' | 'dry' | 'good' | 'medium' | 'rough'

export function dayQuality(worstIndexOfDay: number | undefined): DayQuality {
  if (worstIndexOfDay == null) return 'dry'
  if (worstIndexOfDay >= 65) return 'good'
  if (worstIndexOfDay >= 45) return 'medium'
  return 'rough'
}
