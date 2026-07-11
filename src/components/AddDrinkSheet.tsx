import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatUnits, unitsOf } from '../lib/alcohol'
import { haptic } from '../lib/util'
import { Modal } from './Modal'

export type AddSheetKind =
  | { kind: 'spread'; label: string; volumeMl: number; abv: number; icon: string }
  | { kind: 'shot' }
  | { kind: 'mixed' }

const SPREAD_STOPS = [0, 10, 20, 30, 45]
const SPREAD_LABELS = ['na raz', '10 min', '20 min', '30 min', '45 min']
/** 1 dawka = 40 ml 40% ≈ 12,6 g etanolu */
const DOSE_ALCOHOL_ML = 16

/**
 * Bottom sheet for logging a drink with realistic timing: sipping pace for
 * beer/wine (spread), "X min temu" for shots, and strength/glass for mixed
 * drinks. Shared by the main add flow and the check-in confession so the
 * timeline stays meaningful either way.
 */
export function AddDrinkSheet({
  sheet,
  onAdd,
  onClose,
}: {
  sheet: AddSheetKind
  onAdd: (label: string, volumeMl: number, abv: number, opts?: { spreadMin?: number; ts?: number; note?: string }) => void
  onClose: () => void
}) {
  const [spreadIdx, setSpreadIdx] = useState(2) // default: 20 min
  const [minutesAgo, setMinutesAgo] = useState(5)
  const [doses, setDoses] = useState(2) // drink: default średni
  const [smallGlass, setSmallGlass] = useState(false)

  if (sheet.kind === 'spread') {
    const spread = SPREAD_STOPS[spreadIdx]
    return (
      <Modal title={`${sheet.icon} ${sheet.label} ${sheet.volumeMl} ml`} onClose={onClose}>
        <p className="text-sm text-muted mb-4">W jakim tempie poszło? To zmienia krzywą promili.</p>
        <input
          type="range"
          min={0}
          max={SPREAD_STOPS.length - 1}
          step={1}
          value={spreadIdx}
          onChange={(e) => {
            setSpreadIdx(Number(e.target.value))
            haptic(6)
          }}
        />
        <div className="flex justify-between text-[10px] text-muted mb-3 px-0.5">
          {SPREAD_LABELS.map((l, i) => (
            <span key={l} className={i === spreadIdx ? 'text-mint font-bold' : ''}>
              {l}
            </span>
          ))}
        </div>
        <p className="text-center text-sm mb-5">
          {spread === 0 ? (
            <span className="text-accent font-bold">Na raz — wjedzie szybko</span>
          ) : (
            <>
              Sączone przez <span className="font-bold text-mint">~{spread} min</span>
            </>
          )}
        </p>
        <button
          className="inline-flex h-13 w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold"
          onClick={() => {
            onAdd(sheet.label, sheet.volumeMl, sheet.abv, {
              spreadMin: spread || undefined,
              note: spread ? `sączone ${spread} min` : 'na raz',
            })
            onClose()
          }}
        >
          <Plus size={17} /> Dodaj ({formatUnits(unitsOf(sheet.volumeMl, sheet.abv))} j.)
        </button>
      </Modal>
    )
  }

  if (sheet.kind === 'shot') {
    return (
      <Modal title="🥃 Shot 40 ml" onClose={onClose}>
        <p className="text-sm text-muted mb-4">
          Kiedy poszedł? Mocny alkohol wjeżdża szybko — czas ma znaczenie dla krzywej.
        </p>
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-card2 border border-line text-xl font-bold disabled:opacity-30"
            disabled={minutesAgo <= 0}
            onClick={() => setMinutesAgo((m) => Math.max(0, m - 5))}
          >
            −
          </button>
          <div className="w-32 text-center">
            <p className="text-3xl font-extrabold tabular-nums">{minutesAgo === 0 ? 'teraz' : minutesAgo}</p>
            {minutesAgo > 0 && <p className="text-xs text-muted">min temu</p>}
          </div>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-card2 border border-line text-xl font-bold disabled:opacity-30"
            disabled={minutesAgo >= 120}
            onClick={() => setMinutesAgo((m) => Math.min(120, m + 5))}
          >
            +
          </button>
        </div>
        <button
          className="inline-flex h-13 w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold"
          onClick={() => {
            onAdd('Shot', 40, 40, {
              ts: Date.now() - minutesAgo * 60_000,
              note: minutesAgo ? `${minutesAgo} min temu` : undefined,
            })
            onClose()
          }}
        >
          <Plus size={17} /> Dodaj ({formatUnits(unitsOf(40, 40))} j.)
        </button>
      </Modal>
    )
  }

  // mixed drink: strength = doses of alcohol, glass 250 ml (or small 180 ml)
  const volume = smallGlass ? 180 : 250
  const abv = Math.round(((doses * DOSE_ALCOHOL_ML) / volume) * 1000) / 10
  const strengthName = ['słaby', 'średni', 'mocny'][doses - 1]
  return (
    <Modal title="🍹 Drink" onClose={onClose}>
      <p className="text-sm text-muted mb-3">Jaka moc? Dawka = porcja 40 ml 40%.</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            className={`h-14 rounded-2xl border text-sm font-bold ${
              doses === d ? 'bg-mint text-black border-mint' : 'bg-card2 border-line'
            }`}
            onClick={() => {
              setDoses(d)
              haptic(6)
            }}
          >
            {['słaby', 'średni', 'mocny'][d - 1]}
            <span className={`block text-[10px] font-normal ${doses === d ? 'text-black/60' : 'text-muted'}`}>
              {d} {d === 1 ? 'dawka' : 'dawki'}
            </span>
          </button>
        ))}
      </div>
      <button
        className="inline-flex h-13 w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold mb-3"
        onClick={() => {
          onAdd(`Drink (${strengthName})`, volume, abv, { spreadMin: 15, note: 'sączone ~15 min' })
          onClose()
        }}
      >
        <Plus size={17} /> Dodaj ({formatUnits(unitsOf(volume, abv))} j. · {volume} ml)
      </button>
      <button
        className={`w-full text-center text-xs ${smallGlass ? 'text-mint font-bold' : 'text-muted underline'}`}
        onClick={() => setSmallGlass((s) => !s)}
      >
        {smallGlass ? '✓ mała szklanka 180 ml' : 'mała szklanka? zmień na 180 ml'}
      </button>
    </Modal>
  )
}
