import type { DrinkSession, Profile } from './types'
import { estimatePermille, isStrong, totalUnits, waterDeficit } from './alcohol'

/**
 * Party Index — one human-calibrated cockpit number.
 * 100 = sober, hydrated, fed, tests at baseline. Calibration anchors (80 kg):
 * ~0.8‰ (4 piwa w dobrym tempie) ≈ low 80s — wciąż "idealna strefa", zero moralizowania,
 * ~1.1‰ ≈ low 70s ("dobra zabawa", pierwsze lekkie "uwaga"),
 * ~1.4‰ ≈ mid 50s ("granica"), ~1.7‰+ = "przegięcie", 2‰+ = stop.
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
  if (p <= 0.5) x -= p * 6
  else if (p <= 1.0) x -= 3 + (p - 0.5) * 20
  else if (p <= 1.5) x -= 13 + (p - 1.0) * 44
  else if (p <= 2.0) x -= 35 + (p - 1.5) * 60
  else x -= 65 + (p - 2.0) * 40

  if (i.lastForm != null && i.lastForm < 100) x -= Math.min(18, (100 - i.lastForm) * 0.3)
  x -= Math.min(12, i.waterDeficit * 4)
  if (!i.fedRecently && i.units > 3) x -= 6
  x -= Math.min(10, i.strongRecentUnits * 3.5)

  return Math.round(Math.max(0, Math.min(100, x)))
}

export type IndexZone = 'clean' | 'ideal' | 'good' | 'edge' | 'high' | 'critical'

export function indexZone(index: number, units: number): IndexZone {
  if (units <= 0) return 'clean'
  if (index >= 75) return 'ideal'
  if (index >= 58) return 'good'
  if (index >= 42) return 'edge'
  if (index >= 28) return 'high'
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
  if (index >= 75) return '#34D399'
  if (index >= 58) return '#7DD3FC'
  if (index >= 42) return '#F5A524'
  if (index >= 28) return '#FB923C'
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
  if (worstIndexOfDay >= 58) return 'good'
  if (worstIndexOfDay >= 40) return 'medium'
  return 'rough'
}
