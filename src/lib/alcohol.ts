import type { DrinkEntry, Profile } from './types'

export const ETHANOL_DENSITY = 0.789 // g/ml
/** 1 standard unit (PL) = 10 g of pure ethanol */
export const UNIT_GRAMS = 10
/** Widmark elimination rate, permille per hour */
export const ELIMINATION_PER_HOUR = 0.15

export function gramsOfAlcohol(volumeMl: number, abv: number): number {
  return volumeMl * (abv / 100) * ETHANOL_DENSITY
}

export function unitsOf(volumeMl: number, abv: number): number {
  return gramsOfAlcohol(volumeMl, abv) / UNIT_GRAMS
}

export interface QuickDrink {
  label: string
  icon: string
  volumeMl: number
  abv: number
}

export const QUICK_DRINKS: QuickDrink[] = [
  { label: 'Piwo', icon: '🍺', volumeMl: 500, abv: 5 },
  { label: 'Piwo', icon: '🍺', volumeMl: 330, abv: 5 },
  { label: 'Wino', icon: '🍷', volumeMl: 150, abv: 12 },
  { label: 'Shot', icon: '🥃', volumeMl: 40, abv: 40 },
]

export function widmarkFactor(profile: Profile): number {
  return profile.sex === 'male' ? 0.68 : 0.55
}

/**
 * Simplified Widmark estimate (permille, g/kg). Walks the drink timeline:
 * each drink adds grams/(weight*r), between events BAC decays by
 * ELIMINATION_PER_HOUR, clamped at 0. Drinks sipped over `spreadMin`
 * are split into portions across that window. Orientational only.
 */
export function estimatePermille(drinks: DrinkEntry[], profile: Profile, at: number): number {
  if (drinks.length === 0 || profile.weightKg <= 0) return 0
  const r = widmarkFactor(profile)

  const events: { ts: number; grams: number }[] = []
  for (const d of drinks) {
    const grams = d.units * UNIT_GRAMS
    const spreadMs = (d.spreadMin ?? 0) * 60_000
    if (spreadMs <= 0) {
      events.push({ ts: d.ts, grams })
      continue
    }
    const portions = Math.min(6, Math.max(2, Math.round((d.spreadMin ?? 0) / 8)))
    for (let i = 0; i < portions; i++) {
      events.push({ ts: d.ts - spreadMs + (spreadMs * (i + 0.5)) / portions, grams: grams / portions })
    }
  }
  events.sort((a, b) => a.ts - b.ts)

  let bac = 0
  let prevTs = events[0].ts
  for (const e of events) {
    if (e.ts > at) break
    bac = Math.max(0, bac - ((e.ts - prevTs) / 3_600_000) * ELIMINATION_PER_HOUR)
    bac += e.grams / (profile.weightKg * r)
    prevTs = e.ts
  }
  bac = Math.max(0, bac - (Math.max(0, at - prevTs) / 3_600_000) * ELIMINATION_PER_HOUR)
  return bac
}

export function totalUnits(drinks: DrinkEntry[]): number {
  return drinks.reduce((sum, d) => sum + d.units, 0)
}

/** Suggested glasses of water: one per ~2 units of alcohol. */
export function waterDeficit(units: number, waterGlasses: number): number {
  return Math.max(0, Math.floor(units / 2) - waterGlasses)
}

/** Energy from ethanol alone: ~7 kcal per gram (mixers and snacks not included). */
export function kcalOfUnits(units: number): number {
  return Math.round(units * UNIT_GRAMS * 7)
}

/** "Strong" alcohol (shots, vodka) — absorbed fast, treated with extra care. */
export function isStrong(abv: number): boolean {
  return abv >= 30
}

export function formatUnits(units: number): string {
  return (Math.round(units * 10) / 10).toLocaleString('pl-PL')
}

export function formatPermille(p: number): string {
  return `${p < 0.005 ? '' : '~'}${p.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}‰`
}
