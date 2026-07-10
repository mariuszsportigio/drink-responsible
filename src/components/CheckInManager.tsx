import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppState } from '../state/store'
import { baselineComplete, formPct, randomGame, GAME_META } from '../lib/games'
import type { GameKind } from '../lib/types'
import { QUICK_DRINKS, formatUnits, totalUnits, unitsOf } from '../lib/alcohol'
import { notify } from '../lib/notify'
import { GameHost } from '../games/GameHost'
import { Modal } from '../components/Modal'

/**
 * Watches the active session and fires an hourly check-in:
 * notification + modal → one random mini-game → "confession"
 * (confirm drinks & water from the last hour).
 */
export function CheckInManager() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const session = state.activeSession

  const [due, setDue] = useState(false)
  const [phase, setPhase] = useState<'prompt' | 'game' | 'confess'>('prompt')
  const [kind, setKind] = useState<GameKind>('reflex')
  const [gameValue, setGameValue] = useState<number | null>(null)
  const snoozeTimer = useRef<number | undefined>(undefined)

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

  function snooze(minutes: number) {
    setDue(false)
    snoozeTimer.current = window.setTimeout(() => setDue(true), minutes * 60_000)
  }

  function finishConfession() {
    if (gameValue != null) {
      dispatch({
        type: 'recordCheckIn',
        checkIn: { ts: Date.now(), kind, value: gameValue, formPct: formPct(kind, gameValue, state.baseline) ?? 100 },
      })
      setDue(false)
    } else {
      snooze(15) // game skipped — nag again soon
    }
  }

  if (phase === 'prompt') {
    return (
      <Modal title="⏰ Check-in formy">
        <p className="text-sm text-muted mb-4">
          Minęła godzina sesji. Szybka gierka ({GAME_META[kind].icon} {GAME_META[kind].name}), potem spowiedź z
          drinków i wody.
        </p>
        <div className="flex gap-3">
          <button className="flex-1 h-12 rounded-2xl bg-accent text-black font-bold" onClick={() => setPhase('game')}>
            Start
          </button>
          <button className="h-12 px-4 rounded-2xl bg-card2 border border-line text-sm" onClick={() => snooze(15)}>
            Za 15 min
          </button>
        </div>
      </Modal>
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

  const pct = gameValue != null ? formPct(kind, gameValue, state.baseline) : undefined
  const hourAgo = Date.now() - 3_600_000
  const lastHourDrinks = session.drinks.filter((d) => d.ts >= hourAgo)
  const lastHourWater = session.water.filter((w) => w.ts >= hourAgo)

  return (
    <Modal title="🍺 Spowiedź — ostatnia godzina">
      {gameValue != null && (
        <div className="rounded-2xl bg-card2 border border-line p-4 mb-4 flex items-center justify-between">
          <span className="text-sm text-muted">
            {GAME_META[kind].name}: <span className="text-white font-bold">{GAME_META[kind].describe(gameValue)}</span>
          </span>
          <span className={`text-xl font-extrabold ${pct == null ? 'text-muted' : pct >= 85 ? 'text-mint' : pct >= 70 ? 'text-accent' : 'text-danger'}`}>
            {pct == null ? '—' : `${pct}% formy`}
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
        className="w-full h-11 rounded-xl bg-[#0E2733] border border-aqua/40 text-aqua font-bold text-sm mb-4"
        onClick={() => dispatch({ type: 'addWater' })}
      >
        💧 + Szklanka wody
      </button>
      {pct != null && pct < 70 && (
        <p className="text-sm text-[#F5C6C6] bg-[#3A1A1A] border border-danger/30 rounded-xl px-4 py-3 mb-4">
          Forma poniżej 70% — woda i zwolnij tempo. Żadnych ważnych decyzji, zero kierownicy.
        </p>
      )}
      <button className="w-full h-12 rounded-2xl bg-mint text-black font-bold" onClick={finishConfession}>
        ✅ Wszystko wpisane
      </button>
    </Modal>
  )
}
