import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, X } from 'lucide-react'
import type { GameKind } from '../lib/types'
import { GAME_META } from '../lib/games'
import { GAME_ICONS } from '../components/icons'
import { useLockBodyScroll } from '../lib/useLockBodyScroll'
import { ReflexGame } from './ReflexGame'
import { TraceGame } from './TraceGame'
import { MemoryGame } from './MemoryGame'

export interface GameResult {
  kind: GameKind
  value: number
}

const INSTRUCTIONS: Record<GameKind, string> = {
  reflex:
    'Światła jak na starcie wyścigu: czerwone = czekaj, zielone = TAP natychmiast. W trybie PRO trafiasz w to jedno pole, które się zapali. 5 rund; falstart i pudło = kara czasowa.',
  trace: 'Przeciągnij palcem od zielonego punktu do pomarańczowego, trzymając się szarej ścieżki.',
  memory: 'Zapamiętaj sekwencję podświetlanych pól i powtórz ją. Sekwencja rośnie do 8.',
}

export function GameHost({
  plan,
  title,
  onFinish,
  onCancel,
}: {
  plan: GameKind[]
  title: string
  onFinish: (results: GameResult[]) => void
  onCancel: () => void
}) {
  useLockBodyScroll()
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState<'intro' | 'play'>('intro')
  const [results, setResults] = useState<GameResult[]>([])

  const kind = plan[idx]
  const meta = GAME_META[kind]
  const roundNo = plan.slice(0, idx + 1).filter((k) => k === kind).length
  const roundTotal = plan.filter((k) => k === kind).length
  const last = results[results.length - 1]

  function handleGameFinish(value: number) {
    const next = [...results, { kind, value }]
    if (idx + 1 >= plan.length) {
      onFinish(next)
    } else {
      setResults(next)
      setIdx(idx + 1)
      setStage('intro')
    }
  }

  // Portal to <body>: escapes any transformed ancestor so the overlay always
  // covers the full screen (incl. the TabBar) instead of being clipped by it.
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-bg/95 backdrop-blur-sm overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
      <div className="mx-auto max-w-md px-5 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">{title}</p>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              {(() => {
                const GIcon = GAME_ICONS[kind]
                return <GIcon size={20} className="text-mint" />
              })()}
              {meta.name}
              {roundTotal > 1 && <span className="text-muted font-normal text-base"> · runda {roundNo}/{roundTotal}</span>}
            </h2>
          </div>
          <button
            aria-label="zamknij"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card2 border border-line text-muted"
            onClick={onCancel}
          >
            <X size={16} />
          </button>
        </div>

        {stage === 'intro' ? (
          <div className="flex flex-col gap-5">
            {last && (
              <div className="rounded-2xl bg-card border border-line p-4 text-sm">
                <span className="text-muted">Poprzedni wynik ({GAME_META[last.kind].name}):</span>{' '}
                <span className="font-bold">{GAME_META[last.kind].describe(last.value)}</span>
              </div>
            )}
            <div className="rounded-2xl bg-card border border-line p-5">
              <p className="text-sm leading-relaxed text-white/80">{INSTRUCTIONS[kind]}</p>
            </div>
            <button
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-black font-bold text-lg"
              onClick={() => setStage('play')}
            >
              <Play size={18} fill="currentColor" /> Start ({idx + 1}/{plan.length})
            </button>
          </div>
        ) : (
          <>
            {kind === 'reflex' && <ReflexGame onFinish={handleGameFinish} />}
            {kind === 'trace' && <TraceGame onFinish={handleGameFinish} />}
            {kind === 'memory' && <MemoryGame onFinish={handleGameFinish} />}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
