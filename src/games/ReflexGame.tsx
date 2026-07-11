import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Play } from 'lucide-react'
import { useAppState } from '../state/store'

const ROUNDS = 5
const FALSTART_PENALTY_MS = 60
const MISS_PENALTY_MS = 40
const PRO_CELLS = 18 // 3 × 6

type Phase = 'idle' | 'red' | 'green' | 'feedback' | 'done'

/**
 * Red light / green light reaction test. Classic: the whole tall arena is the
 * button. PRO (settings): 18 zones, only ONE lights up green — hit that one;
 * wrong zone = miss penalty. Tap on red = false start. Lower value = better.
 */
export function ReflexGame({ onFinish }: { onFinish: (value: number) => void }) {
  const pro = useAppState().settings.reflexPro
  const [phase, setPhase] = useState<Phase>('idle')
  const [flash, setFlash] = useState<{ ms?: number; falstart?: boolean; miss?: boolean } | null>(null)
  const [target, setTarget] = useState(0)
  const [, forceRender] = useState(0)
  const times = useRef<number[]>([])
  const falstarts = useRef(0)
  const misses = useRef(0)
  const shownAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function startRound() {
    setFlash(null)
    setPhase('red')
    timer.current = window.setTimeout(() => {
      setTarget(Math.floor(Math.random() * PRO_CELLS))
      shownAt.current = performance.now()
      setPhase('green')
    }, 900 + Math.random() * 1900)
  }

  function finish() {
    setPhase('done')
    const avg = times.current.reduce((a, b) => a + b, 0) / times.current.length
    timer.current = window.setTimeout(
      () => onFinish(Math.round(avg + falstarts.current * FALSTART_PENALTY_MS + misses.current * MISS_PENALTY_MS)),
      900,
    )
  }

  function hit() {
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

  function falstart() {
    window.clearTimeout(timer.current)
    falstarts.current++
    forceRender((n) => n + 1)
    setFlash({ falstart: true })
    setPhase('feedback')
    timer.current = window.setTimeout(startRound, 1000)
  }

  function tapArena() {
    if (phase === 'idle') startRound()
    else if (phase === 'red') falstart()
    else if (phase === 'green' && !pro) hit()
  }

  function tapCell(i: number) {
    if (phase !== 'green') return
    if (i === target) {
      hit()
    } else {
      misses.current++
      forceRender((n) => n + 1)
    }
  }

  const roundNo = Math.min(times.current.length + 1, ROUNDS)
  const msColor = flash?.ms == null ? '' : flash.ms < 300 ? 'text-mint' : flash.ms < 450 ? 'text-accent' : 'text-danger'

  const arenaTone =
    phase === 'red'
      ? 'bg-[#3A1418] border-danger/40'
      : phase === 'green' && !pro
        ? 'bg-[#0E3B24] border-mint/50'
        : 'bg-card2 border-line'

  const overlay = (
    <>
      {phase === 'idle' && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint/10 border border-mint/40 text-mint">
            <Play size={26} fill="currentColor" />
          </span>
          <span className="font-bold text-lg">Tapnij, żeby zacząć</span>
          <span className="text-xs text-muted px-8 text-center">
            {pro
              ? `Czerwone = czekaj. Zapali się JEDNO zielone pole z ${PRO_CELLS} — traf w nie. Pudło −${MISS_PENALTY_MS} ms, falstart −${FALSTART_PENALTY_MS} ms.`
              : `Czerwone = czekaj. Zielone = TAP natychmiast. Falstart to −${FALSTART_PENALTY_MS} ms kary.`}
          </span>
        </span>
      )}
      {phase === 'red' && !pro && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <span className="h-24 w-24 rounded-full bg-danger shadow-[0_0_48px_rgba(248,113,113,0.5)]" />
          <span className="font-bold text-lg tracking-[0.3em] text-danger">CZEKAJ</span>
        </span>
      )}
      {phase === 'green' && !pro && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-5 screen-in">
          <span className="h-28 w-28 rounded-full bg-mint shadow-[0_0_64px_rgba(52,211,153,0.7)]" />
          <span className="font-extrabold text-3xl tracking-[0.3em] text-mint">TAP</span>
        </span>
      )}
      {(phase === 'feedback' || phase === 'done') && flash && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 screen-in z-10">
          {flash.falstart ? (
            <>
              <AlertTriangle size={44} className="text-danger" />
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
    </>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-sm text-muted">
        <span>
          Runda {roundNo}/{ROUNDS}
          {pro && <span className="text-accent font-bold"> · PRO</span>}
        </span>
        <span>
          Falstarty: {falstarts.current}
          {pro && ` · pudła: ${misses.current}`}
        </span>
      </div>
      <div
        aria-label="arena refleksu"
        className={`relative h-[62dvh] min-h-[380px] w-full rounded-3xl border select-none overflow-hidden transition-colors duration-100 ${arenaTone}`}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (pro && phase === 'green') return // cells handle green taps in PRO
          e.preventDefault()
          tapArena()
        }}
      >
        {pro && (phase === 'red' || phase === 'green') && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-6 gap-1.5 p-1.5">
            {Array.from({ length: PRO_CELLS }, (_, i) => (
              <button
                key={i}
                aria-label={`pole ${i + 1}`}
                className={`rounded-xl transition-colors duration-75 ${
                  phase === 'green' && i === target
                    ? 'bg-mint shadow-[0_0_24px_rgba(52,211,153,0.7)]'
                    : 'bg-[#2E1215] border border-danger/20'
                }`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (phase === 'red') falstart()
                  else tapCell(i)
                }}
              />
            ))}
          </div>
        )}
        {overlay}
      </div>
    </div>
  )
}
