import { useState } from 'react'
import { useAppDispatch, useAppState } from '../state/store'
import { dateStr, streakOf } from '../lib/util'

const SUGGESTIONS = ['Woda rano', 'Trening', 'Bez telefonu do 9:00', 'Dzień bez alkoholu', '8h snu']

export function HabitsScreen() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const today = dateStr()

  const doneToday = state.habits.filter((h) => h.doneDates.includes(today)).length

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Systemy &gt; cele</p>
        <h1 className="text-2xl font-extrabold">Nawyki</h1>
        {state.habits.length > 0 && (
          <p className="text-sm text-muted mt-1">
            Dziś: {doneToday}/{state.habits.length}
          </p>
        )}
      </header>

      <div className="flex gap-2 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nowy nawyk…"
          className="flex-1 h-12 rounded-xl bg-card border border-line px-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              dispatch({ type: 'addHabit', name: name.trim() })
              setName('')
            }
          }}
        />
        <button
          disabled={!name.trim()}
          className="h-12 px-5 rounded-xl bg-accent text-black font-bold disabled:opacity-40"
          onClick={() => {
            dispatch({ type: 'addHabit', name: name.trim() })
            setName('')
          }}
        >
          ＋
        </button>
      </div>

      {state.habits.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="rounded-full bg-card border border-line px-4 py-2 text-sm text-muted"
              onClick={() => dispatch({ type: 'addHabit', name: s })}
            >
              ＋ {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {state.habits.map((h) => {
          const done = h.doneDates.includes(today)
          const streak = streakOf(h.doneDates)
          return (
            <div key={h.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${done ? 'bg-[#12251C] border-mint/30' : 'bg-card border-line'}`}>
              <button
                aria-label={done ? 'odznacz' : 'odhacz'}
                className={`h-8 w-8 rounded-full border-2 text-sm font-bold ${
                  done ? 'bg-mint border-mint text-black' : 'border-line text-transparent'
                }`}
                onClick={() => dispatch({ type: 'toggleHabit', id: h.id })}
              >
                ✓
              </button>
              <span className={`flex-1 text-sm font-medium ${done ? 'text-white' : ''}`}>{h.name}</span>
              {streak > 0 && <span className="text-sm text-accent font-bold">🔥 {streak}</span>}
              <button
                className="text-muted/60 text-sm"
                onClick={() => {
                  if (confirm(`Usunąć nawyk „${h.name}"?`)) dispatch({ type: 'removeHabit', id: h.id })
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
