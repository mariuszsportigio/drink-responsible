import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppDispatch, useAppState } from '../state/store'
import { totalUnits, formatUnits, kcalOfUnits } from '../lib/alcohol'
import { alcoholFreeDays, questDef } from '../lib/quests'
import { indexColor, sessionWorstIndex } from '../lib/partyIndex'
import { SessionChart } from '../components/SessionChart'
import { MonthCalendar } from '../components/MonthCalendar'
import { addDays, dateStr, formatDate, formatDuration, haptic } from '../lib/util'
import type { DrinkSession } from '../lib/types'

const TICK = { fill: '#8B9490', fontSize: 11 }
const TOOLTIP_STYLE = {
  backgroundColor: '#1E2622',
  border: '1px solid #2A342F',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
}

export function StatsScreen() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const allSessions: DrinkSession[] = useMemo(
    () => [...state.pastSessions, ...(state.activeSession ? [state.activeSession] : [])],
    [state.pastSessions, state.activeSession],
  )

  const unitsPerDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of allSessions) {
      for (const d of s.drinks) {
        const key = dateStr(new Date(d.ts))
        map.set(key, (map.get(key) ?? 0) + d.units)
      }
    }
    const today = dateStr()
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today, i - 13)
      return { day: day.slice(8) + '.' + day.slice(5, 7), units: Math.round((map.get(day) ?? 0) * 10) / 10 }
    })
  }, [allSessions])

  const weekDrinks = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3_600_000
    return allSessions.flatMap((s) => s.drinks).filter((d) => d.ts >= cutoff)
  }, [allSessions])
  const weekUnits = weekDrinks.reduce((a, d) => a + d.units, 0)

  const goodDaysThisMonth = useMemo(() => {
    const monthKey = dateStr().slice(0, 7)
    const byDay = new Map<string, number>()
    for (const s of state.pastSessions) {
      if (!s.endedAt || s.drinks.length === 0) continue
      const key = dateStr(new Date(s.startedAt))
      if (!key.startsWith(monthKey)) continue
      const worst = s.worstIndex ?? (state.profile ? sessionWorstIndex(s, state.profile) : 50)
      byDay.set(key, Math.min(byDay.get(key) ?? 100, worst))
    }
    return [...byDay.values()].filter((w) => w >= 65).length
  }, [state.pastSessions, state.profile])

  const lastSession = allSessions[allSessions.length - 1]
  const dryDays = alcoholFreeDays(allSessions)

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Dowody, nie opinie</p>
        <h1 className="text-2xl font-extrabold">Staty</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Tile value={`🌿 ${dryDays ?? '—'}`} label="dni bez alkoholu" />
        <Tile value={`🏅 ${goodDaysThisMonth}`} label="dobre dni (miesiąc)" />
        <Tile value={formatUnits(weekUnits)} label="jednostek (7 dni)" />
        <Tile value={`${kcalOfUnits(weekUnits)}`} label="kcal z alkoholu (7 dni)" />
      </div>

      <Section title="Kalendarz — jak leci miesiąc">
        <MonthCalendar sessions={state.pastSessions} profile={state.profile} />
      </Section>

      {lastSession && state.profile && lastSession.drinks.length > 0 && (
        <Section title={`Oś czasu — ${lastSession.endedAt ? 'ostatnia sesja' : 'aktywna sesja'}`}>
          <SessionChart session={lastSession} profile={state.profile} />
        </Section>
      )}

      <Section title="Jednostki alkoholu — 14 dni">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={unitsPerDay} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <CartesianGrid stroke="#232B27" vertical={false} />
            <XAxis dataKey="day" tick={TICK} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="units" name="jedn." fill="#F5A524" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {allSessions.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-2">Sesje</p>
          <div className="flex flex-col gap-2">
            {[...allSessions].reverse().slice(0, 12).map((s) => {
              const worst = s.endedAt
                ? (s.worstIndex ?? (state.profile ? sessionWorstIndex(s, state.profile) : undefined))
                : undefined
              return (
                <div key={s.id} className="rounded-xl bg-card border border-line px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{formatDate(s.startedAt)}</span>
                    <span className="flex-1">
                      {formatUnits(totalUnits(s.drinks))} j. · {s.water.length}💧 ·{' '}
                      {formatDuration((s.endedAt ?? Date.now()) - s.startedAt)}
                    </span>
                    {!s.endedAt && <span className="text-mint text-xs font-bold">AKTYWNA</span>}
                    {worst != null && (
                      <span className="font-bold" style={{ color: indexColor(worst) }}>
                        {worst}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    {(s.quests?.length ?? 0) > 0 && s.endedAt ? (
                      <div className="flex flex-wrap gap-1.5">
                        {s.quests!.map((q) => (
                          <span
                            key={q.id}
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                              q.done ? 'border-mint/40 text-mint bg-mint/5' : 'border-danger/40 text-danger bg-danger/5'
                            }`}
                          >
                            {questDef(q.id).icon} {q.done ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span />
                    )}
                    {s.endedAt &&
                      (s.selfRating != null ? (
                        <span className="text-[11px] text-muted">🖐 Twoja ocena: <span className="text-white font-bold">{s.selfRating}/10</span></span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted mr-1">oceń:</span>
                          {[2, 4, 6, 8, 10].map((r) => (
                            <button
                              key={r}
                              className="h-6 w-6 rounded-md bg-card2 border border-line text-[10px]"
                              onClick={() => {
                                dispatch({ type: 'rateSession', id: s.id, rating: r })
                                haptic()
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {allSessions.length === 0 && (
        <p className="text-sm text-muted rounded-2xl bg-card border border-line p-5 text-center">
          Brak danych. Pierwsza sesja zasili wykresy i kalendarz.
        </p>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-line p-4">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card border border-line p-4 mb-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-3">{title}</p>
      {children}
    </section>
  )
}
