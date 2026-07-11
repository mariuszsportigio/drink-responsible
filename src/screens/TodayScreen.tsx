import { useState } from 'react'
import { useAppDispatch, useAppState } from '../state/store'
import { addDays, dateStr, formatClock, haptic, streakOf } from '../lib/util'

function greeting(): { text: string; icon: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { text: 'Dzień dobry', icon: '☀️' }
  if (h >= 12 && h < 18) return { text: 'Dobre popołudnie', icon: '🌤️' }
  if (h >= 18 && h < 23) return { text: 'Dobry wieczór', icon: '🌙' }
  return { text: 'Późno już…', icon: '🌌' }
}

export function TodayScreen() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [text, setText] = useState('')

  const today = dateStr()
  const mit = state.mits.find((m) => m.date === today)
  const doneDates = state.mits.filter((m) => m.doneAt).map((m) => m.date)
  const streak = streakOf(doneDates)
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const g = greeting()

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          {g.text} {g.icon}
        </p>
        <h1 className="text-2xl font-extrabold first-letter:uppercase">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl bg-card border border-line p-4">
          <p className="text-2xl font-extrabold">🔥 {streak}</p>
          <p className="text-xs text-muted">dni z domkniętym MIT</p>
        </div>
        <div className="rounded-2xl bg-card border border-line p-4">
          <div className="flex gap-1.5 mt-1.5 mb-1.5">
            {last7.map((d) => {
              const m = state.mits.find((x) => x.date === d)
              return (
                <span
                  key={d}
                  className={`h-3.5 w-3.5 rounded-full transition-colors ${
                    m?.doneAt ? 'bg-mint' : m ? 'bg-accent/60' : 'bg-card2 border border-line'
                  }`}
                />
              )
            })}
          </div>
          <p className="text-xs text-muted">ostatnie 7 dni</p>
        </div>
      </div>

      {!mit && (
        <section className="rounded-3xl bg-gradient-to-b from-[#1B2320] to-card border border-line p-5 card-shadow">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1">Most Important Task</p>
          <h2 className="text-xl font-extrabold mb-1">Jedna rzecz. Dziś.</h2>
          <p className="text-sm text-muted mb-4">
            Wybierz to, co MUSI być skończone. Po zablokowaniu nie ma zmiany — to zobowiązanie, nie lista życzeń.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="np. Wysłać ofertę do klienta X"
            rows={3}
            className="w-full rounded-2xl bg-black/30 border border-line p-4 text-base mb-3 resize-none focus:outline-none focus:border-accent/60"
          />
          <button
            disabled={text.trim().length < 3}
            className="h-14 w-full rounded-2xl bg-accent text-black font-bold text-lg disabled:opacity-40"
            onClick={() => {
              dispatch({ type: 'commitMit', text: text.trim() })
              haptic([15, 40, 15])
            }}
          >
            🔒 Zablokuj jako zobowiązanie
          </button>
        </section>
      )}

      {mit && !mit.doneAt && (
        <section className="rounded-3xl border border-accent/35 bg-gradient-to-b from-[#2E2510] to-card p-6 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent">Twój MIT · {formatClock(mit.committedAt)}</p>
            <span className="h-2.5 w-2.5 rounded-full bg-accent pulse-dot" />
          </div>
          <p className="text-2xl font-extrabold leading-snug mb-6">{mit.text}</p>
          <button
            className="h-14 w-full rounded-2xl bg-mint text-black font-bold text-lg"
            onClick={() => {
              dispatch({ type: 'completeMit' })
              haptic([20, 60, 20, 60, 40])
            }}
          >
            ✅ Zrobione
          </button>
        </section>
      )}

      {mit?.doneAt && (
        <section className="rounded-3xl border border-mint/35 bg-gradient-to-b from-[#12301F] to-card p-6 card-shadow">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mint mb-3">MIT domknięty · {formatClock(mit.doneAt)}</p>
          <p className="text-2xl font-extrabold leading-snug mb-3 line-through decoration-mint/60 decoration-4">{mit.text}</p>
          <p className="text-sm text-white/80">
            Dowód w banku. 🔥 {streak} {streak === 1 ? 'dzień' : 'dni'} z rzędu — jutro podbijasz licznik.
          </p>
        </section>
      )}

      {state.mits.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted mt-6 mb-2">Historia</p>
          <div className="flex flex-col gap-2">
            {[...state.mits]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, 10)
              .map((m) => (
                <div key={m.date} className="flex items-center gap-3 rounded-xl bg-card border border-line px-4 py-2.5 text-sm">
                  <span>{m.doneAt ? '✅' : '❌'}</span>
                  <span className="flex-1 truncate">{m.text}</span>
                  <span className="text-muted text-xs tabular-nums">{m.date.slice(5)}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
