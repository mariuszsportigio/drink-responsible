import { useState } from 'react'
import { useAppDispatch, useAppState } from '../state/store'
import { addDays, dateStr, formatClock, streakOf } from '../lib/util'

export function TodayScreen() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [text, setText] = useState('')

  const today = dateStr()
  const mit = state.mits.find((m) => m.date === today)
  const doneDates = state.mits.filter((m) => m.doneAt).map((m) => m.date)
  const streak = streakOf(doneDates)
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Fokus</p>
        <h1 className="text-2xl font-extrabold">
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
                  className={`h-3.5 w-3.5 rounded-full ${
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
        <section className="rounded-3xl bg-card border border-line p-5">
          <h2 className="font-bold mb-1">MIT — Most Important Task</h2>
          <p className="text-sm text-muted mb-3">
            Jedna rzecz, którą DZIŚ musisz skończyć. Po zablokowaniu nie da się jej zmienić — to zobowiązanie.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="np. Wysłać ofertę do klienta X"
            rows={3}
            className="w-full rounded-xl bg-card2 border border-line p-3 text-sm mb-3 resize-none"
          />
          <button
            disabled={text.trim().length < 3}
            className="h-12 w-full rounded-2xl bg-accent text-black font-bold disabled:opacity-40"
            onClick={() => dispatch({ type: 'commitMit', text: text.trim() })}
          >
            🔒 Zablokuj jako zobowiązanie
          </button>
        </section>
      )}

      {mit && !mit.doneAt && (
        <section className="rounded-3xl border border-accent/30 bg-gradient-to-b from-[#2A2210] to-card p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-2">Twój MIT · zablokowany {formatClock(mit.committedAt)}</p>
          <p className="text-xl font-bold leading-snug mb-5">{mit.text}</p>
          <button className="h-14 w-full rounded-2xl bg-mint text-black font-bold text-lg" onClick={() => dispatch({ type: 'completeMit' })}>
            ✅ Zrobione
          </button>
        </section>
      )}

      {mit?.doneAt && (
        <section className="rounded-3xl border border-mint/30 bg-gradient-to-b from-[#12251C] to-card p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mint mb-2">MIT domknięty · {formatClock(mit.doneAt)}</p>
          <p className="text-xl font-bold leading-snug mb-2 line-through decoration-mint/60">{mit.text}</p>
          <p className="text-sm text-muted">Dowód w banku. Jutro kolejny. 🔥 {streak}</p>
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
                  <span className="text-muted text-xs">{m.date.slice(5)}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
