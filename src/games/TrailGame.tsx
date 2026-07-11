import { useEffect, useRef, useState } from 'react'

const LABELS = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F']
const H = 400
const R = 24 // circle radius (px)
const ERROR_PENALTY_MS = 1000

/** Random non-overlapping circle centers within the board. */
function placeCircles(W: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  const margin = R + 6
  const minDist = R * 2 + 12
  for (let i = 0; i < LABELS.length; i++) {
    let placed = false
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const x = margin + Math.random() * (W - margin * 2)
      const y = margin + Math.random() * (H - margin * 2)
      if (pts.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist)) {
        pts.push({ x, y })
        placed = true
      }
    }
    if (!placed) {
      // fallback: loose grid cell with jitter (board is big enough that this is rare)
      const col = i % 3
      const row = Math.floor(i / 3)
      pts.push({ x: margin + (col + 0.5) * ((W - margin * 2) / 3), y: margin + (row + 0.5) * ((H - margin * 2) / 4) })
    }
  }
  return pts
}

/**
 * Trail Making Test (part B): tap circles alternating number→letter (1→A→2→B…).
 * value = completion time in ms + 1 s per wrong tap (lower = better).
 */
export function TrailGame({ onFinish }: { onFinish: (value: number) => void }) {
  const [W] = useState(() => Math.min(340, Math.max(280, window.innerWidth - 40)))
  const [phase, setPhase] = useState<'idle' | 'play'>('idle')
  const [pts, setPts] = useState<{ x: number; y: number }[]>([])
  const [nextIdx, setNextIdx] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wrongFlash, setWrongFlash] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const doneRef = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), [])

  function start() {
    setPts(placeCircles(W))
    setNextIdx(0)
    setErrors(0)
    setElapsed(0)
    doneRef.current = false
    startRef.current = performance.now()
    setPhase('play')
    timers.current.push(window.setInterval(() => setElapsed(performance.now() - startRef.current), 100))
  }

  function tap(i: number, errCount: number) {
    if (phase !== 'play' || doneRef.current) return
    if (i === nextIdx) {
      const next = i + 1
      setNextIdx(next)
      if (next === LABELS.length) {
        doneRef.current = true
        const value = Math.round(performance.now() - startRef.current + errCount * ERROR_PENALTY_MS)
        timers.current.forEach((t) => window.clearInterval(t))
        window.setTimeout(() => onFinish(value), 350)
      }
    } else if (i > nextIdx) {
      // tapping an already-cleared circle is a no-op, only a wrong *future* target counts
      setErrors(errCount + 1)
      setWrongFlash(i)
      window.setTimeout(() => setWrongFlash(null), 250)
    }
  }

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex items-center justify-center rounded-2xl bg-card2 border border-line text-center px-8"
          style={{ width: W, height: H }}
        >
          <p className="text-sm text-muted leading-relaxed">
            Stukaj kółka na zmianę: <span className="text-white font-bold">1 → A → 2 → B → 3 → C…</span>
            <br />
            Czas leci od startu, pomyłka = +1 s.
          </p>
        </div>
        <button className="h-12 w-40 rounded-full bg-accent text-black font-bold" onClick={start}>
          Start
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted h-5">
        Następne: <span className="text-white font-bold">{LABELS[nextIdx] ?? '✓'}</span> · {(elapsed / 1000).toFixed(1)} s
        {errors > 0 && <span className="text-danger"> · pomyłki: {errors}</span>}
      </p>
      <div
        className="relative rounded-2xl bg-card2 border border-line select-none"
        style={{ width: W, height: H, touchAction: 'none' }}
      >
        {pts.map((p, i) => {
          const cleared = i < nextIdx
          const wrong = wrongFlash === i
          return (
            <button
              key={i}
              onPointerDown={() => tap(i, errors)}
              className={`absolute flex items-center justify-center rounded-full border font-bold text-base transition-colors duration-150 ${
                wrong
                  ? 'bg-danger border-danger text-black'
                  : cleared
                    ? 'bg-mint/15 border-mint/50 text-mint'
                    : 'bg-card border-line text-white'
              }`}
              style={{ left: p.x - R, top: p.y - R, width: R * 2, height: R * 2 }}
            >
              {LABELS[i]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
