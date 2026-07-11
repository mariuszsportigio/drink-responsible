import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppState } from '../state/store'
import { estimatePermille, totalUnits, formatUnits } from '../lib/alcohol'
import { alcoholFreeDays, questDef } from '../lib/quests'
import { addDays, dateStr, formatClock, formatDate, formatDuration, streakOf } from '../lib/util'
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

  const weekUnits = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3_600_000
    return allSessions.flatMap((s) => s.drinks).filter((d) => d.ts >= cutoff).reduce((a, d) => a + d.units, 0)
  }, [allSessions])

  const lastSession = allSessions[allSessions.length - 1]
  const formSeries = lastSession?.checkIns.map((c) => ({ t: formatClock(c.ts), forma: c.formPct })) ?? []

  // permille curve of the last session: sampled Widmark estimate + projected burn-down to ~zero
  const permilleSeries = useMemo(() => {
    if (!lastSession || !state.profile || lastSession.drinks.length === 0) return []
    const start = lastSession.startedAt
    const endAnchor = lastSession.endedAt ?? Date.now()
    const permilleAtEnd = estimatePermille(lastSession.drinks, state.profile, endAnchor)
    const end = endAnchor + Math.max(30, (permilleAtEnd / 0.15) * 60 + 15) * 60_000
    if (end <= start) return []
    const SAMPLES = 48
    return Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const t = start + ((end - start) * i) / SAMPLES
      return {
        t: formatClock(t),
        promile: Math.round(estimatePermille(lastSession.drinks, state.profile!, t) * 100) / 100,
      }
    })
  }, [lastSession, state.profile])

  const mitStreak = streakOf(state.mits.filter((m) => m.doneAt).map((m) => m.date))
  const dryDays = alcoholFreeDays(allSessions)

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Dowody, nie opinie</p>
        <h1 className="text-2xl font-extrabold">Statystyki</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Tile value={formatUnits(weekUnits)} label="jednostek (7 dni)" />
        <Tile value={String(allSessions.filter((s) => s.startedAt >= Date.now() - 30 * 24 * 3_600_000).length)} label="sesji (30 dni)" />
        <Tile value={`🔥 ${mitStreak}`} label="streak MIT" />
        <Tile value={`🌿 ${dryDays ?? '—'}`} label="dni bez alkoholu" />
      </div>

      <Section title="Jednostki alkoholu — 14 dni">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={unitsPerDay} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <CartesianGrid stroke="#232B27" vertical={false} />
            <XAxis dataKey="day" tick={TICK} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="units" name="jedn." fill="#F5A524" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {permilleSeries.length > 1 && (
        <Section title={`Promile w czasie — ${lastSession.endedAt ? 'ostatnia sesja' : 'aktywna sesja'}`}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={permilleSeries} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="permilleFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5A524" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F5A524" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#232B27" vertical={false} />
              <XAxis dataKey="t" tick={TICK} tickLine={false} axisLine={false} interval={Math.floor(permilleSeries.length / 5)} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}‰`, 'promile']} />
              <ReferenceLine y={0.5} stroke="#F87171" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="promile"
                stroke="#F5A524"
                strokeWidth={2.5}
                fill="url(#permilleFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted/70 mt-1">
            czerwona linia: 0,5‰ · ogon za końcem sesji = projekcja spalania · szacunek Widmarka, orientacyjnie
          </p>
        </Section>
      )}

      {formSeries.length > 1 && (
        <Section title={`Forma w czasie — ${lastSession.endedAt ? 'ostatnia sesja' : 'aktywna sesja'}`}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={formSeries} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
              <CartesianGrid stroke="#232B27" vertical={false} />
              <XAxis dataKey="t" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 125]} tick={TICK} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={100} stroke="#34D399" strokeDasharray="4 4" />
              <ReferenceLine y={70} stroke="#F87171" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="forma" stroke="#F5A524" strokeWidth={2.5} dot={{ fill: '#F5A524', r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      )}

      {allSessions.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-2">Sesje</p>
          <div className="flex flex-col gap-2">
            {[...allSessions].reverse().slice(0, 10).map((s) => {
              const minForm = s.checkIns.length ? Math.min(...s.checkIns.map((c) => c.formPct)) : undefined
              return (
                <div key={s.id} className="rounded-xl bg-card border border-line px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{formatDate(s.startedAt)}</span>
                    <span className="flex-1">
                      {formatUnits(totalUnits(s.drinks))} j. · {s.water.length}💧 ·{' '}
                      {formatDuration((s.endedAt ?? Date.now()) - s.startedAt)}
                    </span>
                    {!s.endedAt && <span className="text-mint text-xs font-bold">AKTYWNA</span>}
                    {minForm != null && (
                      <span className={minForm >= 85 ? 'text-mint' : minForm >= 70 ? 'text-accent' : 'text-danger'}>
                        min {minForm}%
                      </span>
                    )}
                  </div>
                  {(s.quests?.length ?? 0) > 0 && s.endedAt && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.quests!.map((q) => (
                        <span
                          key={q.id}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                            q.done ? 'border-mint/40 text-mint bg-mint/5' : 'border-danger/40 text-danger bg-danger/5'
                          }`}
                        >
                          {questDef(q.id).icon} {questDef(q.id).title(q.target)} {q.done ? '✓' : '✗'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {allSessions.length === 0 && (
        <p className="text-sm text-muted rounded-2xl bg-card border border-line p-5 text-center">
          Brak danych. Pierwsza sesja Drink Responsible zasili wykresy.
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
