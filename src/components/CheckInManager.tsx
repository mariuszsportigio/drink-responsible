import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppState } from '../state/store'
import { baselineComplete, formPct, randomGame, GAME_META } from '../lib/games'
import type { GameKind } from '../lib/types'
import { QUICK_DRINKS, formatUnits, totalUnits, unitsOf } from '../lib/alcohol'
import { buildRecallChips, gradeRecall, pickMemoWords, recallComment } from '../lib/recall'
import { notify } from '../lib/notify'
import { haptic } from '../lib/util'
import { GameHost } from '../games/GameHost'
import { Modal } from '../components/Modal'

/**
 * Watches the active session and fires an hourly check-in:
 * notification + modal → delayed-recall word quiz → one random mini-game →
 * "confession" (confirm drinks & water) → new words to memorize.
 */
export function CheckInManager() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const session = state.activeSession

  const [due, setDue] = useState(false)
  const [phase, setPhase] = useState<'prompt' | 'recall' | 'game' | 'confess'>('prompt')
  const [kind, setKind] = useState<GameKind>('reflex')
  const [gameValue, setGameValue] = useState<number | null>(null)
  const [recallResult, setRecallResult] = useState<{ correct: number; total: number } | null>(null)
  const snoozeTimer = useRef<number | undefined>(undefined)

  const recallOn = state.settings.memoRecallEnabled
  const lastTs = session ? (session.checkIns[session.checkIns.length - 1]?.ts ?? session.startedAt) : 0
  const ready = !!session && baselineComplete(state.baseline)

  useEffect(() => {
    if (!ready) {
      setDue(false)
      return
    }
    const fire = () => {
      setKind(randomGame())
      setPhase('prompt')
      setGameValue(null)
      setRecallResult(null)
      setDue(true)
      void notify('Check-in formy 🍻', 'Szybka gierka + spowiedź: co doszło przez ostatnią godzinę?')
    }
    const delay = lastTs + state.settings.checkInMinutes * 60_000 - Date.now()
    if (delay <= 0) {
      fire()
      return
    }
    const t = window.setTimeout(fire, delay)
    return () => window.clearTimeout(t)
  }, [ready, lastTs, state.settings.checkInMinutes, session?.id])

  useEffect(() => () => window.clearTimeout(snoozeTimer.current), [])

  if (!session || !due) return null

  const hasRecallQuiz = recallOn && (session.memoWords?.length ?? 0) > 0

  function snooze(minutes: number) {
    setDue(false)
    snoozeTimer.current = window.setTimeout(() => setDue(true), minutes * 60_000)
  }

  function finishConfession(newWords: string[] | undefined) {
    if (gameValue != null) {
      dispatch({
        type: 'recordCheckIn',
        checkIn: {
          ts: Date.now(),
          kind,
          value: gameValue,
          formPct: formPct(kind, gameValue, state.baseline) ?? 100,
          recall: recallResult ?? undefined,
        },
      })
      dispatch({ type: 'setMemoWords', words: newWords })
      haptic()
      setDue(false)
    } else {
      snooze(15) // game skipped — nag again soon
    }
  }

  if (phase === 'prompt') {
    return (
      <Modal title="⏰ Check-in formy">
        <p className="text-sm text-muted mb-4">
          Minęła godzina sesji. {hasRecallQuiz ? 'Najpierw pamięć: co miałeś zapamiętać? Potem' : 'Szybka'} gierka (
          {GAME_META[kind].icon} {GAME_META[kind].name}) i spowiedź z drinków i wody.
        </p>
        <div className="flex gap-3">
          <button
            className="flex-1 h-12 rounded-2xl bg-accent text-black font-bold"
            onClick={() => setPhase(hasRecallQuiz ? 'recall' : 'game')}
          >
            Start
          </button>
          <button className="h-12 px-4 rounded-2xl bg-card2 border border-line text-sm" onClick={() => snooze(15)}>
            Za 15 min
          </button>
        </div>
      </Modal>
    )
  }

  if (phase === 'recall' && session.memoWords) {
    return (
      <RecallQuiz
        words={session.memoWords}
        onDone={(correct, total) => {
          setRecallResult({ correct, total })
          setPhase('game')
        }}
      />
    )
  }

  if (phase === 'game') {
    return (
      <GameHost
        plan={[kind]}
        title="Check-in"
        onFinish={(results) => {
          setGameValue(results[0].value)
          setPhase('confess')
        }}
        onCancel={() => setPhase('confess')}
      />
    )
  }

  return (
    <ConfessionSheet
      kind={kind}
      gameValue={gameValue}
      recallResult={recallResult}
      onFinish={finishConfession}
    />
  )
}

function RecallQuiz({ words, onDone }: { words: string[]; onDone: (correct: number, total: number) => void }) {
  const [chips] = useState(() => buildRecallChips(words))
  const [picked, setPicked] = useState<string[]>([])
  const [graded, setGraded] = useState<number | null>(null)

  function toggle(word: string) {
    if (graded != null) return
    setPicked((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : prev.length < words.length ? [...prev, word] : prev,
    )
  }

  function grade() {
    const correct = gradeRecall(picked, words)
    setGraded(correct)
    haptic(correct === words.length ? [15, 50, 15] : 40)
    window.setTimeout(() => onDone(correct, words.length), 1600)
  }

  return (
    <Modal title="🧠 Co miałeś zapamiętać?">
      <p className="text-sm text-muted mb-4">
        Wybierz {words.length} słowa z ostatniego check-inu — <span className="text-white/80">kolejność się liczy</span>.
      </p>

      <div className="flex gap-2 mb-4 min-h-11">
        {Array.from({ length: words.length }, (_, i) => (
          <button
            key={i}
            className={`flex-1 h-11 rounded-xl border text-sm font-bold ${
              graded != null
                ? picked[i] === words[i]
                  ? 'bg-mint/15 border-mint/50 text-mint'
                  : 'bg-danger/10 border-danger/50 text-danger line-through'
                : picked[i]
                  ? 'bg-card2 border-accent/50'
                  : 'bg-black/25 border-line border-dashed text-muted'
            }`}
            onClick={() => picked[i] && graded == null && toggle(picked[i])}
          >
            {graded != null && picked[i] !== words[i] ? words[i] : (picked[i] ?? `${i + 1}.`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {chips.map((w) => {
          const isPicked = picked.includes(w)
          return (
            <button
              key={w}
              disabled={graded != null}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium ${
                isPicked ? 'bg-card border-line text-muted/40' : 'bg-card2 border-line'
              }`}
              onClick={() => toggle(w)}
            >
              {w}
            </button>
          )
        })}
      </div>

      {graded == null ? (
        <button
          disabled={picked.length !== words.length}
          className="w-full h-12 rounded-2xl bg-accent text-black font-bold disabled:opacity-40"
          onClick={grade}
        >
          Zatwierdź
        </button>
      ) : (
        <p className="screen-in text-center text-sm font-bold">
          {graded}/{words.length} · <span className="text-muted font-normal">{recallComment(graded, words.length)}</span>
        </p>
      )}
    </Modal>
  )
}

function ConfessionSheet({
  kind,
  gameValue,
  recallResult,
  onFinish,
}: {
  kind: GameKind
  gameValue: number | null
  recallResult: { correct: number; total: number } | null
  onFinish: (newWords: string[] | undefined) => void
}) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const session = state.activeSession!
  const recallOn = state.settings.memoRecallEnabled
  const newWords = useMemo(() => (recallOn ? pickMemoWords() : undefined), [recallOn])

  const pct = gameValue != null ? formPct(kind, gameValue, state.baseline) : undefined
  const hourAgo = Date.now() - 3_600_000
  const lastHourDrinks = session.drinks.filter((d) => d.ts >= hourAgo)
  const lastHourWater = session.water.filter((w) => w.ts >= hourAgo)

  return (
    <Modal title="🍺 Spowiedź — ostatnia godzina">
      {gameValue != null && (
        <div className="rounded-2xl bg-card2 border border-line p-4 mb-3 flex items-center justify-between">
          <span className="text-sm text-muted">
            {GAME_META[kind].name}: <span className="text-white font-bold">{GAME_META[kind].describe(gameValue)}</span>
          </span>
          <span
            className={`text-xl font-extrabold ${pct == null ? 'text-muted' : pct >= 85 ? 'text-mint' : pct >= 70 ? 'text-accent' : 'text-danger'}`}
          >
            {pct == null ? '—' : `${pct}% formy`}
          </span>
        </div>
      )}
      {recallResult && (
        <div className="rounded-2xl bg-card2 border border-line p-4 mb-3 text-sm flex items-center justify-between">
          <span className="text-muted">
            Pamięć odroczona: <span className="text-white font-bold">{recallResult.correct}/{recallResult.total}</span>
          </span>
          <span className={recallResult.correct === recallResult.total ? 'text-mint' : recallResult.correct >= 2 ? 'text-accent' : 'text-danger'}>
            {recallResult.correct === recallResult.total ? '🔒' : recallResult.correct >= 2 ? '👌' : '😬'}
          </span>
        </div>
      )}
      <p className="text-sm text-muted mb-3">
        Zapisane z ostatniej godziny: {lastHourDrinks.length} drink(i) ({formatUnits(totalUnits(lastHourDrinks))} j.),{' '}
        {lastHourWater.length} × woda. Czegoś brakuje? Dobij teraz:
      </p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {QUICK_DRINKS.map((d) => (
          <button
            key={`${d.label}-${d.volumeMl}`}
            className="rounded-xl bg-card2 border border-line px-3 py-2.5 text-sm text-left"
            onClick={() => dispatch({ type: 'addDrink', label: d.label, volumeMl: d.volumeMl, abv: d.abv })}
          >
            {d.icon} {d.label} {d.volumeMl} · {formatUnits(unitsOf(d.volumeMl, d.abv))} j.
          </button>
        ))}
      </div>
      <button
        className="w-full h-11 rounded-xl bg-[#0E2733] border border-aqua/40 text-aqua font-bold text-sm mb-3"
        onClick={() => dispatch({ type: 'addWater' })}
      >
        💧 + Szklanka wody
      </button>
      {pct != null && pct < 70 && (
        <p className="text-sm text-[#F5C6C6] bg-[#3A1A1A] border border-danger/30 rounded-xl px-4 py-3 mb-3">
          Forma poniżej 70% — woda i zwolnij tempo. Żadnych ważnych decyzji, zero kierownicy.
        </p>
      )}
      {newWords && (
        <div className="screen-in rounded-2xl border border-accent/40 bg-gradient-to-b from-[#2E2510] to-card p-4 mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-2">🧠 Zapamiętaj na następny check-in</p>
          <p className="text-2xl font-extrabold tracking-wide text-center py-1">{newWords.join(' · ')}</p>
          <p className="text-[11px] text-muted text-center mt-1">Zapytam za {state.settings.checkInMinutes} min. Bez ściągi.</p>
        </div>
      )}
      <button className="w-full h-12 rounded-2xl bg-mint text-black font-bold" onClick={() => onFinish(newWords)}>
        ✅ Wszystko wpisane
      </button>
    </Modal>
  )
}
