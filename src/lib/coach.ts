import { ELIMINATION_PER_HOUR } from './alcohol'
import { indexZone } from './partyIndex'
import { OVERLAY_NO_FOOD, OVERLAY_RECALL_FAIL, OVERLAY_SPIKE, ZONE_LINES, type LineCtx } from './coachLines'

export interface CoachCtx {
  index: number
  permille: number
  units: number
  deficit: number
  kcal: number
  /** units of strong alcohol (≥30%) in the last hour */
  strongRecentUnits: number
  fedRecently: boolean
  recall?: { correct: number; total: number }
}

/** Estimated time until ~0.00‰ at the fixed Widmark burn rate. */
export function soberEta(permille: number, at: number = Date.now()): { hours: number; at: Date } {
  const hours = permille / ELIMINATION_PER_HOUR
  return { hours, at: new Date(at + hours * 3_600_000) }
}

export function formatEta(permille: number): string {
  if (permille < 0.01) return 'teraz'
  const eta = soberEta(permille)
  const clock = eta.at.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  return eta.hours >= 24 ? `za ~${Math.round(eta.hours)} h` : `~${clock}${eta.at.getDate() !== new Date().getDate() ? ' (jutro)' : ''}`
}

function pick<T>(pool: T[], seed: number): T {
  return pool[Math.abs(seed) % pool.length]
}

/**
 * Live coach: picks a line for the current Party Index zone, rotating every
 * 10 minutes so it never gets stale. Urgent overlays (fresh shots, empty
 * stomach, failed memory quiz) cut in ahead of the zone pool.
 */
export function coachLine(ctx: CoachCtx): string {
  const zone = indexZone(ctx.index, ctx.units)
  const bucket = Math.floor(Date.now() / 600_000)
  const seed = bucket + Math.round(ctx.units * 7)
  const c: LineCtx = {
    p: ctx.permille.toLocaleString('pl-PL', { maximumFractionDigits: 2 }),
    eta: formatEta(ctx.permille),
    units: ctx.units.toLocaleString('pl-PL', { maximumFractionDigits: 1 }),
    deficit: ctx.deficit,
    kcal: ctx.kcal,
  }

  if (ctx.strongRecentUnits >= 1.8 && ctx.permille >= 0.5) return pick(OVERLAY_SPIKE, seed)(c)
  if (ctx.recall && ctx.recall.total >= 3 && ctx.recall.correct <= 1 && zone !== 'clean' && zone !== 'critical') {
    return pick(OVERLAY_RECALL_FAIL, seed)(c)
  }
  if (!ctx.fedRecently && ctx.units > 4 && zone !== 'critical' && bucket % 3 === 0) return pick(OVERLAY_NO_FOOD, seed)(c)

  return pick(ZONE_LINES[zone], seed)(c)
}

/** Closing line for the end-of-session summary. */
export function coachSummary(units: number, questsDone: number, questsTotal: number, worstIndex?: number): string {
  if (units === 0) return 'Sesja bez alkoholu — to się liczy do streaka. Szacun.'
  if (worstIndex != null && worstIndex >= 75) return `Party Index nie spadł poniżej ${worstIndex} — wieczór wzorcowy. Tak wygląda plan zrealizowany w 100%.`
  if (questsTotal > 0 && questsDone === questsTotal) return `Wszystkie questy zaliczone (${questsDone}/${questsTotal}). Plan > impuls. Dokładnie tak.`
  if (worstIndex != null && worstIndex < 35) return `W najgorszym momencie index spadł do ${worstIndex}. Bez oceniania — ale jutro rzuć okiem na wykres i wyciągnij jeden wniosek.`
  if (questsTotal > 0 && questsDone === 0) return `Questy 0/${questsTotal}. Nie tragedia, ale dane nie kłamią — następnym razem postaw niższy próg i go dowieź.`
  if (questsTotal > 0) return `Questy ${questsDone}/${questsTotal}. Częściowa kontrola to wciąż kontrola — jutro spójrz na wykres i wyciągnij wnioski.`
  if (units <= 4) return 'Umiarkowanie i z pomiarem. Więcej takich sesji.'
  return 'Sporo tego było. Woda przed snem, a jutro zero — dane z tej sesji zostają w statystykach.'
}
