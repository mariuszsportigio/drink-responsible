import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DrinkSession, Profile } from '../lib/types'
import { ELIMINATION_PER_HOUR, estimatePermille } from '../lib/alcohol'
import { formatClock } from '../lib/util'

const TICK = { fill: '#8B9490', fontSize: 11 }

function drinkIcon(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('piwo')) return '🍺'
  if (l.includes('wino')) return '🍷'
  if (l.includes('shot')) return '🥃'
  return '🍹'
}

function EmojiDot(props: { cx?: number; cy?: number; payload?: { icon?: string } }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload?.icon) return null
  return (
    <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={15}>
      {payload.icon}
    </text>
  )
}

/**
 * Full-session timeline: Widmark permille curve (with burn-down projection),
 * form% from check-ins on a second axis, and 🍺💧 event markers.
 */
export function SessionChart({ session, profile }: { session: DrinkSession; profile: Profile }) {
  const { curve, drinks, water, checks, end, maxP } = useMemo(() => {
    const start = session.startedAt
    const endAnchor = session.endedAt ?? Date.now()
    const pEnd = estimatePermille(session.drinks, profile, endAnchor)
    const end = endAnchor + Math.max(20, (pEnd / ELIMINATION_PER_HOUR) * 60 + 15) * 60_000
    const SAMPLES = 64
    const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const ts = start + ((end - start) * i) / SAMPLES
      return { ts, promile: Math.round(estimatePermille(session.drinks, profile, ts) * 1000) / 1000 }
    })
    const maxP = Math.max(0.6, ...curve.map((c) => c.promile))
    const drinks = session.drinks.map((d) => ({
      ts: d.ts,
      promile: Math.round(estimatePermille(session.drinks, profile, d.ts) * 1000) / 1000,
      icon: drinkIcon(d.label),
      name: `${d.label} ${d.volumeMl} ml`,
    }))
    const water = session.water.map((w) => ({ ts: w.ts, promile: maxP * 0.04, icon: '💧', name: 'Szklanka wody' }))
    const checks = session.checkIns.map((c) => ({ ts: c.ts, forma: c.formPct }))
    return { curve, drinks, water, checks, end, maxP }
  }, [session, profile])

  if (session.drinks.length === 0) return null

  const domain: [number, number] = [session.startedAt, end]

  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={curve} margin={{ top: 8, right: -22, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="sessFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A524" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#F5A524" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#232B27" vertical={false} />
          <XAxis
            type="number"
            dataKey="ts"
            domain={domain}
            scale="time"
            tickFormatter={(ts: number) => formatClock(ts)}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            tickCount={6}
          />
          <YAxis
            yAxisId="p"
            domain={[0, Math.ceil(maxP * 12) / 10]}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
          />
          <YAxis yAxisId="f" orientation="right" domain={[0, 130]} tick={TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E2622',
              border: '1px solid #2A342F',
              borderRadius: 12,
              color: '#fff',
              fontSize: 12,
            }}
            labelFormatter={(ts: number) => formatClock(ts)}
            formatter={(value: number, name: string, entry: { payload?: { name?: string } }) => {
              if (name === 'promile') return [`${value}‰`, entry.payload?.name ?? 'promile']
              if (name === 'forma') return [`${value}%`, 'forma']
              return [value, name]
            }}
          />
          <ReferenceLine yAxisId="p" y={0.5} stroke="#F87171" strokeDasharray="4 4" />
          {session.endedAt && <ReferenceLine yAxisId="p" x={session.endedAt} stroke="#8B9490" strokeDasharray="3 5" />}
          <Area
            yAxisId="p"
            type="monotone"
            dataKey="promile"
            stroke="#F5A524"
            strokeWidth={2.5}
            fill="url(#sessFill)"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="f"
            data={checks}
            type="monotone"
            dataKey="forma"
            stroke="#34D399"
            strokeWidth={2}
            strokeDasharray="1 0"
            dot={{ fill: '#34D399', r: 4 }}
            isAnimationActive={false}
          />
          <Scatter yAxisId="p" data={drinks} dataKey="promile" shape={<EmojiDot />} isAnimationActive={false} />
          <Scatter yAxisId="p" data={water} dataKey="promile" shape={<EmojiDot />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted/80">
        <span><span className="text-accent">▬</span> promile (lewa oś)</span>
        <span><span className="text-mint">●</span> forma % (prawa oś)</span>
        <span>🍺🥃🍷 drink</span>
        <span>💧 woda</span>
        <span className="text-danger/80">- - 0,5‰</span>
      </div>
      <p className="text-[10px] text-muted/70 mt-1">ogon za pionową kreską = projekcja spalania · dotknij wykresu po szczegóły</p>
    </div>
  )
}
