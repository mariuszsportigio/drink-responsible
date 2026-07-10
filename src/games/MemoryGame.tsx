import { useEffect, useRef, useState } from 'react'

const CELLS = 9
const START_LEN = 3
const MAX_LEN = 8
const SHOW_MS = 480
const GAP_MS = 170

function extendSeq(seq: number[]): number[] {
  let next = Math.floor(Math.random() * CELLS)
  while (seq.length > 0 && next === seq[seq.length - 1]) next = Math.floor(Math.random() * CELLS)
  return [...seq, next]
}

/** Simon-style sequence; value = longest fully repeated sequence (higher = better). */
export function MemoryGame({ onFinish }: { onFinish: (value: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'show' | 'input'>('idle')
  const [seq, setSeq] = useState<number[]>([])
  const [inputIdx, setInputIdx] = useState(0)
  const [lit, setLit] = useState<number | null>(null)
  const [flash, setFlash] = useState<{ cell: number; ok: boolean } | null>(null)
  const best = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  function play(sequence: number[]) {
    setSeq(sequence)
    setInputIdx(0)
    setPhase('show')
    sequence.forEach((cell, i) => {
      later(() => setLit(cell), i * (SHOW_MS + GAP_MS))
      later(() => setLit(null), i * (SHOW_MS + GAP_MS) + SHOW_MS)
    })
    later(() => setPhase('input'), sequence.length * (SHOW_MS + GAP_MS) + 100)
  }

  function start() {
    let s: number[] = []
    for (let i = 0; i < START_LEN; i++) s = extendSeq(s)
    play(s)
  }

  function tap(cell: number) {
    if (phase !== 'input') return
    if (cell === seq[inputIdx]) {
      setFlash({ cell, ok: true })
      later(() => setFlash(null), 200)
      const next = inputIdx + 1
      if (next === seq.length) {
        best.current = seq.length
        if (seq.length >= MAX_LEN) {
          onFinish(best.current)
        } else {
          setPhase('idle')
          later(() => play(extendSeq(seq)), 700)
        }
      } else {
        setInputIdx(next)
      }
    } else {
      setFlash({ cell, ok: false })
      later(() => onFinish(best.current), 450)
      setPhase('idle')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted h-5">
        {phase === 'show' && 'Zapamiętaj sekwencję…'}
        {phase === 'input' && `Powtórz (${inputIdx}/${seq.length})`}
        {phase === 'idle' && seq.length > 0 && `Poziom zaliczony: ${best.current}`}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: CELLS }, (_, i) => {
          const isLit = lit === i
          const f = flash?.cell === i ? flash : null
          return (
            <button
              key={i}
              onPointerDown={() => tap(i)}
              className={`h-20 w-20 rounded-2xl border transition-colors duration-150 ${
                f ? (f.ok ? 'bg-mint border-mint' : 'bg-danger border-danger') : isLit ? 'bg-accent border-accent' : 'bg-card2 border-line'
              }`}
            />
          )
        })}
      </div>
      {seq.length === 0 && (
        <button className="h-12 w-40 rounded-full bg-accent text-black font-bold" onClick={start}>
          Start
        </button>
      )}
    </div>
  )
}
