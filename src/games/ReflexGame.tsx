import { useEffect, useRef, useState } from 'react'

const ROUNDS = 5
const MISS_PENALTY_MS = 50

/** Tap appearing circles; value = avg reaction time in ms + penalty per miss (lower = better). */
export function ReflexGame({ onFinish }: { onFinish: (value: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'wait' | 'target'>('idle')
  const [count, setCount] = useState(3)
  const [times, setTimes] = useState<number[]>([])
  const [errors, setErrors] = useState(0)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const shownAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function startCountdown() {
    setPhase('countdown')
    setCount(3)
    const tick = (n: number) => {
      if (n === 0) {
        scheduleTarget()
        return
      }
      setCount(n)
      timer.current = window.setTimeout(() => tick(n - 1), 650)
    }
    tick(3)
  }

  function scheduleTarget() {
    setPhase('wait')
    timer.current = window.setTimeout(() => {
      setPos({ x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 })
      shownAt.current = performance.now()
      setPhase('target')
    }, 600 + Math.random() * 1400)
  }

  function hitTarget(e: React.PointerEvent) {
    e.stopPropagation()
    const rt = performance.now() - shownAt.current
    const next = [...times, rt]
    setTimes(next)
    if (next.length >= ROUNDS) {
      const avg = next.reduce((a, b) => a + b, 0) / next.length
      onFinish(Math.round(avg + errors * MISS_PENALTY_MS))
    } else {
      scheduleTarget()
    }
  }

  function arenaTap() {
    if (phase === 'wait') {
      // false start — restart the round
      window.clearTimeout(timer.current)
      setErrors((e) => e + 1)
      scheduleTarget()
    } else if (phase === 'target') {
      setErrors((e) => e + 1)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-sm text-muted">
        <span>Runda {Math.min(times.length + 1, ROUNDS)}/{ROUNDS}</span>
        <span>Pomyłki: {errors}</span>
      </div>
      <div
        className="relative h-[380px] rounded-2xl bg-card2 border border-line overflow-hidden select-none"
        onPointerDown={arenaTap}
      >
        {phase === 'idle' && (
          <button
            className="absolute inset-0 m-auto h-14 w-40 rounded-full bg-accent text-black font-bold"
            onPointerDown={(e) => {
              e.stopPropagation()
              startCountdown()
            }}
          >
            Start
          </button>
        )}
        {phase === 'countdown' && (
          <p key={count} className="screen-in absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-6xl font-extrabold text-accent">
            {count}
          </p>
        )}
        {phase === 'wait' && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-muted">Czekaj…</p>
        )}
        {phase === 'target' && (
          <button
            aria-label="cel"
            className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint shadow-[0_0_24px_rgba(52,211,153,0.6)]"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onPointerDown={hitTarget}
          />
        )}
      </div>
      {times.length > 0 && (
        <p className="text-center text-sm text-muted">
          Ostatni: <span className="text-white">{Math.round(times[times.length - 1])} ms</span>
        </p>
      )}
    </div>
  )
}
