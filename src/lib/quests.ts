import type { DrinkSession, SessionQuest, QuestId } from './types'
import { totalUnits, waterDeficit } from './alcohol'

export interface QuestDef {
  id: QuestId
  icon: string
  title: (target?: number) => string
  desc: string
  /** selectable targets (maxUnits only) */
  targets?: number[]
  evaluate: (s: DrinkSession, target: number | undefined, at: number) => boolean
  /** live progress label shown during the session */
  progress: (s: DrinkSession, target: number | undefined, at: number) => string
}

export const QUEST_DEFS: QuestDef[] = [
  {
    id: 'maxUnits',
    icon: '🎯',
    title: (t) => `Limit ${t ?? '?'} jednostek`,
    desc: 'Nie przekrocz limitu do końca sesji.',
    targets: [3, 4, 6],
    evaluate: (s, t) => totalUnits(s.drinks) <= (t ?? 0) + 0.01,
    progress: (s, t) => `${(Math.round(totalUnits(s.drinks) * 10) / 10).toLocaleString('pl-PL')}/${t} j.`,
  },
  {
    id: 'waterDiscipline',
    icon: '💧',
    title: () => 'Woda w ryzach',
    desc: 'Skończ sesję bez zaległej wody (1 szklanka na ~2 jednostki).',
    evaluate: (s) => waterDeficit(totalUnits(s.drinks), s.water.length) === 0,
    progress: (s) => {
      const d = waterDeficit(totalUnits(s.drinks), s.water.length)
      return d === 0 ? 'na bieżąco' : `-${d} szkl.`
    },
  },
  {
    id: 'formAbove70',
    icon: '⚡',
    title: () => 'Stabilna forma',
    desc: 'Każdy check-in ≥ 70% baseline (minimum jeden check-in).',
    evaluate: (s) => s.checkIns.length > 0 && s.checkIns.every((c) => c.formPct >= 70),
    progress: (s) => {
      if (s.checkIns.length === 0) return 'brak check-inów'
      const min = Math.min(...s.checkIns.map((c) => c.formPct))
      return `min ${min}%`
    },
  },
  {
    id: 'slowPace',
    icon: '🐢',
    title: () => 'Spokojne tempo',
    desc: 'Utrzymaj tempo ≤ 1,5 jednostki na godzinę.',
    evaluate: (s, _t, at) => {
      const hours = Math.max(1, ((s.endedAt ?? at) - s.startedAt) / 3_600_000)
      return totalUnits(s.drinks) / hours <= 1.5
    },
    progress: (s, _t, at) => {
      const hours = Math.max(0.25, ((s.endedAt ?? at) - s.startedAt) / 3_600_000)
      return `${(Math.round((totalUnits(s.drinks) / hours) * 10) / 10).toLocaleString('pl-PL')} j./h`
    },
  },
]

export function questDef(id: QuestId): QuestDef {
  return QUEST_DEFS.find((q) => q.id === id)!
}

export function evaluateQuests(session: DrinkSession, at: number = Date.now()): SessionQuest[] {
  return (session.quests ?? []).map((q) => ({ ...q, done: questDef(q.id).evaluate(session, q.target, at) }))
}

/** Complete days without a single logged drink; null when there is no drink history at all. */
export function alcoholFreeDays(sessions: DrinkSession[], now: number = Date.now()): number | null {
  let lastDrink = 0
  for (const s of sessions) for (const d of s.drinks) if (d.ts > lastDrink) lastDrink = d.ts
  if (lastDrink === 0) return null
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfDrinkDay = new Date(lastDrink)
  startOfDrinkDay.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((startOfToday.getTime() - startOfDrinkDay.getTime()) / 86_400_000))
}
