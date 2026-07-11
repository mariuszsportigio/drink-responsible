import { useMemo, useState } from 'react'
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
import { partyIndex, sessionIndexInput } from '../lib/partyIndex'
import { formatClock } from '../lib/util'

const TICK = { fill: '#8B9490', fontSize: 11 }

type Metric = 'index' | 'promile' | 'forma'

const METRICS: { id: Metric; label: string; color: string }[] = [
  { id: 'index', label: 'Index', color: '#34D399' },
  { id: 'promile', label: 'Promile', color: '#F5A524' },
  { id: 'forma', label: 'Forma', color: '#7DD3FC' },
]

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
 * Full-session timeline with a metric switch (Party Index / promile / forma%).
 * Index and promile are continuous curves (promile includes a burn-down
 * projection tail); forma is the sparse check-in series. 🍺💧 markers ride
 * the active curve.
 */
export function SessionChart({ session, profile }: { session: DrinkSession; profile: Profile }) {
  const [metric, setMetric] = useState<Metric>('index')

  const { curve, drinkPts, waterPts, checks, end, maxP } = useMemo(() => {
    const start = session.startedAt
    const endAnchor = session.endedAt ?? Date.now()
    const pEnd = estimatePermille(session.drinks, profile, endAnchor)
    const end = endAnchor + Math.max(20, (pEnd / ELIMINATION_PER_HOUR) * 60 + 15) * 60_000
    const SAMPLES = 64
    const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const ts = start + ((end - start) * i) / SAMPLES
      return {
        ts,
        promile: Math.round(estimatePermille(session.drinks, profile, ts) * 1000) / 1000,
        index: partyIndex(sessionIndexInput(session, profile, ts)),
      }
    })
    const maxP = Math.max(0.6, ...curve.map((c) => c.promile))
    const valueAt = (ts: number) => ({
      promile: Math.round(estimatePermille(session.drinks, profile, ts) * 1000) / 1000,
      index: partyIndex(sessionIndexInput(session, profile, ts)),
    })
    const drinkPts = session.drinks.map((d) => ({
      ts: d.ts,
      ...valueAt(d.ts),
      icon: drinkIcon(d.label),
      name: `${d.label} ${d.volumeMl} ml`,
    }))
    const waterPts = session.water.map((w) => ({ ts: w.ts, ...valueAt(w.ts), icon: '💧', name: 'Szklanka wody' }))
    const checks = session.checkIns.map((c) => ({ ts: c.ts, forma: c.formPct }))
    return { curve, drinkPts, waterPts, checks, end, maxP }
  }, [session, profile])

  if (session.drinks.length === 0) return null

  const domain: [number, number] = [session.startedAt, end]
  const active = METRICS.find((m) => m.id === metric)!
  const noForma = metric === 'forma' && checks.length === 0

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {METRICS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${
              metric === m.id ? 'text-black border-transparent' : 'text-muted border-line bg-card2'
            }`}
            style={metric === m.id ? { backgroundColor: m.color } : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={curve} margin={{ top: 8, right: -22, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="sessFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={active.color} stopOpacity={0.02} />
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
            domain={metric === 'promile' ? [0, Math.ceil(maxP * 12) / 10] : [0, metric === 'forma' ? 130 : 100]}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
          />
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
              if (name === 'index') return [`${value}`, entry.payload?.name ?? 'index']
              if (name === 'forma') return [`${value}%`, 'forma']
              return [value, name]
            }}
          />
          {metric === 'promile' && <ReferenceLine y={0.5} stroke="#F87171" strokeDasharray="4 4" />}
          {session.endedAt && <ReferenceLine x={session.endedAt} stroke="#8B9490" strokeDasharray="3 5" />}

          {metric === 'forma' ? (
            <Line
              data={checks}
              type="monotone"
              dataKey="forma"
              stroke={active.color}
              strokeWidth={2.5}
              dot={{ fill: active.color, r: 4 }}
              isAnimationActive={false}
              connectNulls
            />
          ) : (
            <Area
              type="monotone"
              dataKey={metric}
              stroke={active.color}
              strokeWidth={2.5}
              fill="url(#sessFill)"
              dot={false}
              isAnimationActive={false}
            />
          )}

          {metric !== 'forma' && (
            <>
              <Scatter data={drinkPts} dataKey={metric} shape={<EmojiDot />} isAnimationActive={false} />
              <Scatter data={waterPts} dataKey={metric} shape={<EmojiDot />} isAnimationActive={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {noForma && (
        <p className="text-[11px] text-muted text-center mt-1">
          Brak check-inów w tej sesji — forma nie ma jeszcze punktów.
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted/80">
        {metric === 'index' && <span><span style={{ color: active.color }}>▬</span> Party Index (0–100)</span>}
        {metric === 'promile' && (
          <>
            <span><span style={{ color: active.color }}>▬</span> promile</span>
            <span className="text-danger/80">- - 0,5‰</span>
          </>
        )}
        {metric === 'forma' && <span><span style={{ color: active.color }}>●</span> forma % (check-iny)</span>}
        {metric !== 'forma' && <><span>🍺🥃🍷 drink</span><span>💧 woda</span></>}
      </div>
      <p className="text-[10px] text-muted/70 mt-1">
        {metric === 'forma'
          ? 'Forma z gierek na check-inach vs Twój baseline · dotknij punktu po szczegóły'
          : 'ogon za pionową kreską = projekcja spalania · dotknij wykresu po szczegóły'}
      </p>
    </div>
  )
}
