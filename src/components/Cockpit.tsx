import { useRef, useState } from 'react'
import { ZONE_LABEL, indexColor, indexZone } from '../lib/partyIndex'
import { haptic } from '../lib/util'

interface Metric {
  id: 'index' | 'permille' | 'form'
  label: string
  display: string
  sub: string
  color: string
}

/**
 * Gym-bike style cockpit: one big primary number, the other two metrics as
 * chips above it. Tap a chip (or swipe the big number) to switch what's primary.
 */
export function Cockpit({ index, permille, form, units }: { index: number; permille: number; form?: number; units: number }) {
  const zone = indexZone(index, units)
  const metrics: Metric[] = [
    {
      id: 'index',
      label: 'Party Index',
      display: String(index),
      sub: `/100 · ${ZONE_LABEL[zone]}`,
      color: indexColor(index),
    },
    {
      id: 'permille',
      label: 'Promile',
      display: permille.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      sub: '‰ · szacunek Widmarka',
      color: permille <= 0.5 ? '#34D399' : permille <= 1 ? '#F5A524' : '#F87171',
    },
    {
      id: 'form',
      label: 'Forma',
      display: form == null ? '—' : String(form),
      sub: form == null ? 'zrób check formy' : '% Twojego baseline',
      color: form == null ? '#8B9490' : form >= 85 ? '#34D399' : form >= 70 ? '#F5A524' : '#F87171',
    },
  ]

  const [mainId, setMainId] = useState<Metric['id']>('index')
  const touchX = useRef(0)
  const main = metrics.find((m) => m.id === mainId)!
  const others = metrics.filter((m) => m.id !== mainId)

  function cycle(dir: 1 | -1) {
    const ids = metrics.map((m) => m.id)
    const next = ids[(ids.indexOf(mainId) + dir + ids.length) % ids.length]
    setMainId(next)
    haptic(8)
  }

  return (
    <div
      className="select-none"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 44) cycle(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex justify-center gap-2 mb-2">
        {others.map((m) => (
          <button
            key={m.id}
            className="rounded-full bg-black/25 border border-line px-3.5 py-1.5 text-xs text-muted"
            onClick={() => {
              setMainId(m.id)
              haptic(8)
            }}
          >
            {m.label}: <span className="font-bold" style={{ color: m.color }}>{m.display}</span>
          </button>
        ))}
      </div>
      <div key={mainId} className="screen-in text-center py-1">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted">{main.label}</p>
        <p
          className="text-[64px] font-extrabold tabular-nums leading-none my-1"
          style={{ color: main.color, textShadow: `0 0 28px ${main.color}44` }}
        >
          {main.display}
        </p>
        <p className="text-xs text-muted">{main.sub}</p>
      </div>
    </div>
  )
}
