import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DrinkSession, Profile } from '../lib/types'
import { dayQuality, sessionWorstIndex, type DayQuality } from '../lib/partyIndex'
import { dateStr } from '../lib/util'

const DAY_HEAD = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N']

const QUALITY_STYLE: Record<DayQuality, string> = {
  none: 'text-muted/30',
  dry: 'border border-mint/50 text-mint',
  good: 'bg-mint text-black font-bold',
  medium: 'bg-accent text-black font-bold',
  rough: 'bg-danger text-black font-bold',
}

/** Month grid painted by day quality: dry / good index / medium / rough. */
export function MonthCalendar({ sessions, profile }: { sessions: DrinkSession[]; profile?: Profile }) {
  const [offset, setOffset] = useState(0)

  const { label, cells, counts } = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + offset)
    const year = base.getFullYear()
    const month = base.getMonth()
    const label = base.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })

    const worstByDay = new Map<string, number>()
    let firstDataTs = Infinity
    for (const s of sessions) {
      if (!s.endedAt || s.drinks.length === 0) continue
      firstDataTs = Math.min(firstDataTs, s.startedAt)
      const key = dateStr(new Date(s.startedAt))
      const worst = s.worstIndex ?? (profile ? sessionWorstIndex(s, profile) : 50)
      worstByDay.set(key, Math.min(worstByDay.get(key) ?? 100, worst))
    }
    // sessions define drinking days; also count days of drinks even if session spans midnight
    for (const s of sessions) {
      for (const d of s.drinks) {
        const key = dateStr(new Date(d.ts))
        if (!worstByDay.has(key)) {
          const worst = s.worstIndex ?? (profile ? sessionWorstIndex(s, profile) : 50)
          worstByDay.set(key, worst)
        }
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
    const todayKey = dateStr()
    const firstDataKey = firstDataTs === Infinity ? todayKey : dateStr(new Date(firstDataTs))

    const counts = { dry: 0, good: 0, medium: 0, rough: 0 }
    const cells: { day: number; quality: DayQuality; isToday: boolean }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateStr(new Date(year, month, day))
      let quality: DayQuality
      if (key > todayKey || key < firstDataKey) {
        quality = 'none'
      } else {
        quality = dayQuality(worstByDay.get(key))
      }
      if (quality !== 'none') counts[quality]++
      cells.push({ day, quality, isToday: key === todayKey })
    }
    return { label, cells: { firstWeekday, list: cells }, counts }
  }, [sessions, profile, offset])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          aria-label="poprzedni miesiąc"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card2 border border-line text-muted"
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-bold text-sm first-letter:uppercase">{label}</p>
        <button
          aria-label="następny miesiąc"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card2 border border-line text-muted disabled:opacity-30"
          disabled={offset >= 0}
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {DAY_HEAD.map((d, i) => (
          <span key={i} className="text-center text-[10px] text-muted/60">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: cells.firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {cells.list.map((c) => (
          <span
            key={c.day}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs ${QUALITY_STYLE[c.quality]} ${
              c.isToday ? 'ring-2 ring-white/40' : ''
            }`}
          >
            {c.day}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-muted">
        <span>
          <span className="text-mint">◻</span> bez picia ({counts.dry})
        </span>
        <span>
          <span className="text-mint">■</span> dobry index ({counts.good})
        </span>
        <span>
          <span className="text-accent">■</span> średnio ({counts.medium})
        </span>
        <span>
          <span className="text-danger">■</span> ostro ({counts.rough})
        </span>
      </div>
    </div>
  )
}
