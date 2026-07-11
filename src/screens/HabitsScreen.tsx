import { useState } from 'react'
import { useAppDispatch, useAppState } from '../state/store'
import { addDays, dateStr, haptic, streakOf } from '../lib/util'

const SUGGESTIONS = ['Woda rano', 'Trening', 'Bez telefonu do 9:00', 'Dzień bez alkoholu', '8h snu']
const DAY_LETTERS = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N']

export function HabitsScreen() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const today = dateStr()
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  const doneToday = state.habits.filter((h) => h.doneDates.includes(today)).length
  const allDone = state.habits.length > 0 && doneToday === state.habits.length

  function addHabit(habitName: string) {
    if (!habitName.trim()) return
    dispatch({ type: 'addHabit', name: habitName.trim() })
    setName('')
    haptic()
  }

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Systemy &gt; cele</p>
        <h1 className="text-2xl font-extrabold">Nawyki</h1>
        {state.habits.length > 0 && (
          <p className="text-sm mt-1">
            <span className={allDone ? 'text-mint font-bold' : 'text-muted'}>
              Dziś: {doneToday}/{state.habits.length}
              {allDone && ' — komplet! 💪'}
            </span>
          </p>
        )}
      </header>

      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nowy nawyk…"
          className="flex-1 h-12 rounded-xl bg-card border border-line px-3 text-sm focus:outline-none focus:border-mint/50"
          onKeyDown={(e) => e.key === 'Enter' && addHabit(name)}
        />
        <button
          disabled={!name.trim()}
          className="h-12 px-5 rounded-xl bg-accent text-black font-bold disabled:opacity-40"
          onClick={() => addHabit(name)}
        >
          ＋
        </button>
      </div>

      {state.habits.length === 0 && (
        <section className="rounded-3xl bg-card border border-line p-5 mb-4 text-center">
          <p className="text-3xl mb-2">🌱</p>
          <h2 className="font-bold mb-1">Małe rzeczy, codziennie</h2>
          <p className="text-sm text-muted mb-4">Streak buduje się sam — Ty tylko odhaczasz. Zacznij od jednego:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="rounded-full bg-card2 border border-line px-4 py-2 text-sm"
                onClick={() => addHabit(s)}
              >
                ＋ {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2.5">
        {state.habits.map((h) => {
          const done = h.doneDates.includes(today)
          const streak = streakOf(h.doneDates)
          return (
            <div
              key={h.id}
              className={`rounded-2xl border p-4 transition-colors ${done ? 'bg-[#12251C] border-mint/30' : 'bg-card border-line'}`}
            >
              <div className="flex items-center gap-3">
                <button
                  aria-label={done ? 'odznacz' : 'odhacz'}
                  className={`h-9 w-9 shrink-0 rounded-full border-2 text-sm font-bold transition-colors ${
                    done ? 'bg-mint border-mint text-black' : 'border-line text-transparent'
                  }`}
                  onClick={() => {
                    dispatch({ type: 'toggleHabit', id: h.id })
                    if (!done) haptic()
                  }}
                >
                  ✓
                </button>
                <span className="flex-1 text-sm font-medium">{h.name}</span>
                {streak > 0 && <span className="text-sm text-accent font-bold whitespace-nowrap">🔥 {streak}</span>}
                <button
                  aria-label="usuń nawyk"
                  className="text-muted/50 text-sm px-1"
                  onClick={() => {
                    if (confirm(`Usunąć nawyk „${h.name}"?`)) dispatch({ type: 'removeHabit', id: h.id })
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-1.5 mt-3 ml-12">
                {last7.map((d) => {
                  const hit = h.doneDates.includes(d)
                  const isToday = d === today
                  return (
                    <span key={d} className="flex flex-col items-center gap-1">
                      <span
                        className={`h-5 w-5 rounded-md text-[9px] flex items-center justify-center font-bold transition-colors ${
                          hit ? 'bg-mint/80 text-black' : isToday ? 'bg-card2 border border-accent/50 text-muted' : 'bg-card2 border border-line text-transparent'
                        }`}
                      >
                        {hit ? '✓' : '·'}
                      </span>
                      <span className={`text-[9px] ${isToday ? 'text-accent' : 'text-muted/60'}`}>
                        {DAY_LETTERS[(new Date(d).getDay() + 6) % 7]}
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
