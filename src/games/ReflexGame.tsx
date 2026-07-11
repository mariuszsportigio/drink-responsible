import { useEffect, useRef, useState } from 'react'

const ROUNDS = 5
const FALSTART_PENALTY_MS = 60

type Phase = 'idle' | 'red' | 'green' | 'feedback' | 'done'

/**
 * Red light / green light reaction test — the whole tall arena is the button.
 * Tap on green as fast as you can; tapping on red = false start (time penalty).
 * value = avg reaction ms + penalty per false start (lower = better).
 */
export function ReflexGame({ onFinish }: { onFinish: (value: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [flash, setFlash] = useState<{ ms?: number; falstart?: boolean } | null>(null)
  const [, forceRender] = useState(0)
  const times = useRef<number[]>([])
  const falstarts = useRef(0)
  const shownAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function startRound() {
    setFlash(null)
    setPhase('red')
    timer.current = window.setTimeout(() => {
      shownAt.current = performance.now()
      setPhase('green')
    }, 900 + Math.random() * 1900)
  }

  function finish() {
    setPhase('done')
    const avg = times.current.reduce((a, b) => a + b, 0) / times.current.length
    timer.current = window.setTimeout(
      () => onFinish(Math.round(avg + falstarts.current * FALSTART_PENALTY_MS)),
      900,
    )
  }

  function tap() {
    if (phase === 'idle') {
      startRound()
      return
    }
    if (phase === 'red') {
      window.clearTimeout(timer.current)
      falstarts.current++
      forceRender((n) => n + 1)
      setFlash({ falstart: true })
      setPhase('feedback')
      timer.current = window.setTimeout(startRound, 1000)
      return
    }
    if (phase === 'green') {
      const rt = performance.now() - shownAt.current
      times.current.push(rt)
      setFlash({ ms: Math.round(rt) })
      if (times.current.length >= ROUNDS) {
        finish()
      } else {
        setPhase('feedback')
        timer.current = window.setTimeout(startRound, 850)
      }
    }
  }

  const roundNo = Math.min(times.current.length + 1, ROUNDS)
  const msColor = flash?.ms == null ? '' : flash.ms < 300 ? 'text-mint' : flash.ms < 450 ? 'text-accent' : 'text-danger'

  const arena =
    phase === 'red'
      ? 'bg-[#3A1418] border-danger/40'
      : phase === 'green'
        ? 'bg-[#0E3B24] border-mint/50'
        : 'bg-card2 border-line'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-sm text-muted">
        <span>Runda {roundNo}/{ROUNDS}</span>
        <span>Falstarty: {falstarts.current}</span>
      </div>
      <button
        aria-label="arena refleksu"
        className={`relative h-[62dvh] min-h-[380px] w-full rounded-3xl border select-none transition-colors duration-100 ${arena}`}
        style={{ touchAction: 'none' }}
        onPointerDown={tap}
      >
        {phase === 'idle' && (
          <span className="flex flex-col items-center gap-2">
            <span className="text-4xl">🚦</span>
            <span className="font-bold text-lg">Tapnij, żeby zacząć</span>
            <span className="text-xs text-muted px-8">
              Czerwone = czekaj. Zielone = TAP natychmiast. Falstart to −{FALSTART_PENALTY_MS} ms kary.
            </span>
          </span>
        )}
        {phase === 'red' && (
          <span className="flex flex-col items-center gap-3">
            <span className="text-6xl">🔴</span>
            <span className="font-bold text-lg tracking-widest text-danger">CZEKAJ…</span>
          </span>
        )}
        {phase === 'green' && (
          <span className="flex flex-col items-center gap-3 screen-in">
            <span className="text-7xl">🟢</span>
            <span className="font-extrabold text-3xl tracking-widest text-mint">TAP!</span>
          </span>
        )}
        {(phase === 'feedback' || phase === 'done') && flash && (
          <span className="flex flex-col items-center gap-2 screen-in">
            {flash.falstart ? (
              <>
                <span className="text-5xl">😅</span>
                <span className="font-extrabold text-2xl text-danger">FALSTART</span>
                <span className="text-sm text-muted">−{FALSTART_PENALTY_MS} ms kary · czekaj na zielone</span>
              </>
            ) : (
              <>
                <span className={`font-extrabold text-6xl tabular-nums ${msColor}`}>{flash.ms}</span>
                <span className="text-sm text-muted">ms{phase === 'done' ? ' · koniec!' : ''}</span>
              </>
            )}
          </span>
        )}
      </button>
    </div>
  )
}
