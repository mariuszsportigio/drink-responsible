import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sanitizeImportedState, useAppDispatch, useAppState } from '../state/store'
import { QUICK_DRINKS, estimatePermille, formatPermille, formatUnits, kcalOfUnits, totalUnits, unitsOf, waterDeficit } from '../lib/alcohol'
import { indexColor, partyIndex, sessionIndexInput } from '../lib/partyIndex'
import { GAME_KINDS, GAME_META, baselineComplete, baselineStale, formPct } from '../lib/games'
import { coachLine, coachSummary, formatEta } from '../lib/coach'
import { QUEST_DEFS, alcoholFreeDays, evaluateQuests, questDef } from '../lib/quests'
import type { DrinkSession, GameKind, Sex, SessionQuest } from '../lib/types'
import { formatClock, formatDate, formatDuration, haptic, median, uid } from '../lib/util'
import { formatRecallScore } from '../lib/recall'
import {
  Activity,
  Check,
  Compass,
  Download,
  Droplets,
  Flag,
  Flame,
  FlaskConical,
  Info,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Target,
  TrendingDown,
  Upload,
  X,
} from 'lucide-react'
import { GameHost, type GameResult } from '../games/GameHost'
import { Cockpit } from '../components/Cockpit'
import { Modal } from '../components/Modal'
import { MethodsInfoModal } from '../components/MethodsInfo'
import { GAME_ICONS, QUEST_ICONS } from '../components/icons'
import { ensureNotifyPermission, notificationsSupported } from '../lib/notify'

const BASELINE_PLAN: GameKind[] = ['reflex', 'reflex', 'reflex', 'trace', 'trace', 'trace', 'memory', 'memory', 'memory']

function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

export function DrinkScreen() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const session = state.activeSession
  const stillBurning = [...state.pastSessions, ...(session ? [session] : [])].some((s) =>
    s.drinks.some((d) => d.ts >= Date.now() - 24 * 3_600_000),
  )
  const now = useNow(!!session || stillBurning)

  const [gameMode, setGameMode] = useState<null | { plan: GameKind[]; title: string; mode: 'baseline' | 'single' }>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuestPick, setShowQuestPick] = useState(false)
  const [showEndSummary, setShowEndSummary] = useState(false)
  const [showMethods, setShowMethods] = useState(false)
  const [practice, setPractice] = useState<GameResult | null>(null)
  const [toast, setToast] = useState<{ msg: string; undoId?: string } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [addSheet, setAddSheet] = useState<AddSheetKind | null>(null)

  function showToast(msg: string, undoId?: string) {
    window.clearTimeout(toastTimer.current)
    setToast({ msg, undoId })
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }

  function quickAdd(label: string, volumeMl: number, abv: number, opts?: { spreadMin?: number; ts?: number; note?: string }) {
    const id = uid()
    dispatch({ type: 'addDrink', label, volumeMl, abv, id, spreadMin: opts?.spreadMin, ts: opts?.ts })
    haptic()
    showToast(`${label} ${volumeMl} ml · +${formatUnits(unitsOf(volumeMl, abv))} j.${opts?.note ? ` · ${opts.note}` : ''}`, id)
  }

  const hasProfile = !!state.profile
  const hasBaseline = baselineComplete(state.baseline)
  const units = session ? totalUnits(session.drinks) : 0
  const permille = session && state.profile ? estimatePermille(session.drinks, state.profile, now) : 0
  const deficit = session ? waterDeficit(units, session.water.length) : 0
  const lastCheck = session?.checkIns[session.checkIns.length - 1]
  const liveQuests = session?.quests?.length ? evaluateQuests(session, now) : []

  // permille across ALL drinks from the last 24h — keeps burning down after the session ends
  const recentDrinks = [...state.pastSessions, ...(session ? [session] : [])]
    .flatMap((s) => s.drinks)
    .filter((d) => d.ts >= now - 24 * 3_600_000)
  const recentPermille = state.profile ? estimatePermille(recentDrinks, state.profile, now) : 0

  const idxInput = session && state.profile ? sessionIndexInput(session, state.profile, now) : null
  const pIndex = idxInput ? partyIndex(idxInput) : 100

  const latestByKind = useMemo(() => {
    const map: Partial<Record<GameKind, { value: number; formPct: number }>> = {}
    for (const c of session?.checkIns ?? []) map[c.kind] = { value: c.value, formPct: c.formPct }
    return map
  }, [session?.checkIns])

  function finishGames(results: GameResult[]) {
    if (!gameMode) return
    if (gameMode.mode === 'baseline') {
      const byKind = (k: GameKind) => results.filter((r) => r.kind === k).map((r) => r.value)
      dispatch({
        type: 'setBaseline',
        baseline: {
          reflex: median(byKind('reflex')),
          trace: median(byKind('trace')),
          memory: median(byKind('memory')),
          calibratedAt: Date.now(),
        },
      })
    } else {
      const r = results[0]
      if (session) {
        dispatch({
          type: 'recordCheckIn',
          checkIn: { ts: Date.now(), kind: r.kind, value: r.value, formPct: formPct(r.kind, r.value, state.baseline) ?? 100 },
        })
      } else {
        setPractice(r)
      }
    }
    setGameMode(null)
  }

  return (
    <div className="px-5 pt-6 pb-32">
      <header className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Pij świadomie</p>
          <h1 className="text-2xl font-extrabold">Drink Responsible</h1>
        </div>
        <button
          aria-label="ustawienia"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-line text-muted"
          onClick={() => setShowSettings(true)}
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </header>

      {hasProfile && (session || recentPermille > 0.005) && <SobrietyBar permille={recentPermille} />}

      {!hasProfile && <ProfileCard />}

      {hasProfile && (!hasBaseline || baselineStale(state.baseline)) && (
        <section className="rounded-3xl bg-card border border-line p-5 mb-4">
          <h2 className="font-bold mb-1">{hasBaseline ? 'Baseline się starzeje' : 'Kalibracja baseline'}</h2>
          <p className="text-sm text-muted mb-3">
            {hasBaseline
              ? 'Minęło ponad 30 dni — odśwież pomiar na trzeźwo, żeby porównania były uczciwe.'
              : 'Zanim zaczniesz sesję, zmierz swoją normę NA TRZEŹWO: 3 rundy każdej z 3 gier (zapisujemy medianę).'}
          </p>
          <button
            className="h-12 w-full rounded-2xl bg-mint text-black font-bold"
            onClick={() => setGameMode({ plan: BASELINE_PLAN, title: 'Kalibracja baseline', mode: 'baseline' })}
          >
            {hasBaseline ? 'Odśwież baseline (9 rund)' : 'Zmierz baseline (9 rund)'}
          </button>
        </section>
      )}

      {session ? (
        <section className="rounded-3xl border border-mint/25 bg-gradient-to-b from-[#12251C] to-card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-mint pulse-dot" />
              <span className="text-xs font-bold tracking-widest">SESJA AKTYWNA</span>
            </div>
            <button
              className="rounded-full bg-card2 border border-line px-4 py-1.5 text-sm"
              onClick={() => setShowEndSummary(true)}
            >
              Zakończ
            </button>
          </div>

          <Cockpit index={pIndex} permille={permille} form={lastCheck?.formPct} units={units} />

          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="rounded-xl bg-black/25 border border-line py-2">
              <p className="text-base font-extrabold leading-tight">{formatUnits(units)}</p>
              <p className="text-[10px] text-muted">jednostek</p>
            </div>
            <div className="rounded-xl bg-black/25 border border-line py-2">
              <p className="text-base font-extrabold leading-tight">{formatDuration(now - session.startedAt)}</p>
              <p className="text-[10px] text-muted">czas</p>
            </div>
            <div className="rounded-xl bg-black/25 border border-line py-2">
              <p className="text-base font-extrabold leading-tight text-aqua">{session.water.length}</p>
              <p className="text-[10px] text-muted">woda</p>
            </div>
            <div className="rounded-xl bg-black/25 border border-line py-2">
              <p className="text-base font-extrabold leading-tight text-accent">{kcalOfUnits(units)}</p>
              <p className="text-[10px] text-muted">kcal*</p>
            </div>
          </div>

          {permille >= 0.01 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <Flame size={13} className="text-accent" /> spalanie ~0,15‰/h · zero{' '}
              <span className="text-white/80">{formatEta(permille)}</span>
            </p>
          )}

          {liveQuests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {liveQuests.map((q) => {
                const def = questDef(q.id)
                const QIcon = QUEST_ICONS[q.id]
                return (
                  <span
                    key={q.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      q.done ? 'bg-[#12251C] border-mint/40 text-mint' : 'bg-[#2A1A12] border-danger/40 text-[#F5C6C6]'
                    }`}
                  >
                    <QIcon size={13} /> {def.title(q.target)} · {def.progress(session, q.target, now)}
                  </span>
                )
              })}
            </div>
          )}

          {(() => {
            const line = coachLine({
              index: pIndex,
              units,
              permille,
              deficit,
              kcal: kcalOfUnits(units),
              strongRecentUnits: idxInput?.strongRecentUnits ?? 0,
              fedRecently: idxInput?.fedRecently ?? true,
              recall: lastCheck?.recall,
            })
            return (
              <div key={line} className="screen-in mt-4 flex gap-2.5 rounded-2xl bg-black/25 border border-line px-4 py-3 text-sm text-white/85 leading-relaxed">
                <Compass size={16} className="mt-0.5 shrink-0 text-muted" />
                <span>{line}</span>
              </div>
            )
          })()}

          {deficit > 0 && (
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-[#3A3213] border border-accent/30 px-4 py-3 text-sm text-[#F3E3B0]">
              <Droplets size={16} className="shrink-0 text-aqua" />
              <span>Stosunek alkohol:woda się psuje — dolej {deficit > 1 ? `${deficit} szklanki` : 'szklankę'} wody.</span>
            </div>
          )}
          {lastCheck && lastCheck.formPct < 70 && (
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-[#3A1A1A] border border-danger/30 px-4 py-3 text-sm text-[#F5C6C6]">
              <TrendingDown size={16} className="shrink-0 text-danger" />
              <span>Forma poniżej 70% normy. Woda, wolniejsze tempo, żadnych ważnych decyzji.</span>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-3xl bg-card border border-line p-5 mb-5">
          <h2 className="font-bold mb-1">Brak aktywnej sesji</h2>
          <p className="text-sm text-muted mb-4">
            {!hasProfile
              ? 'Najpierw uzupełnij profil (waga i płeć) — bez tego nie policzę promili.'
              : !hasBaseline
                ? 'Najpierw zmierz baseline na trzeźwo — bez tego nie porównam Twojej formy.'
                : 'Zaczynasz pić? Odpal sesję — każdy drink 1 tapnięciem, check-in formy co godzinę.'}
          </p>
          <button
            disabled={!hasProfile || !hasBaseline}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-mint text-black font-bold text-lg disabled:opacity-40"
            onClick={() => setShowQuestPick(true)}
          >
            <Play size={19} fill="currentColor" /> Zacznij sesję
          </button>
        </section>
      )}

      {!session && <RateYesterdayCard />}
      {!session && <AlcoholFreeCard />}

      {session && (
        <>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-2">Dodaj</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {QUICK_DRINKS.map((d) => (
              <button
                key={`${d.label}-${d.volumeMl}`}
                className="flex items-center gap-3 rounded-2xl bg-card border border-line p-4 text-left active:bg-card2"
                onClick={() =>
                  d.abv >= 30
                    ? setAddSheet({ kind: 'shot' })
                    : setAddSheet({ kind: 'spread', label: d.label, volumeMl: d.volumeMl, abv: d.abv, icon: d.icon })
                }
              >
                <span className="text-2xl">{d.icon}</span>
                <span className="flex-1">
                  <span className="block font-bold text-sm">{d.label}</span>
                  <span className="block text-xs text-muted">
                    {d.volumeMl} ml · {formatUnits(unitsOf(d.volumeMl, d.abv))} j.
                  </span>
                </span>
                <Plus size={16} className="text-muted" />
              </button>
            ))}
            <button
              className="flex items-center gap-3 rounded-2xl bg-card border border-line p-4 text-left active:bg-card2"
              onClick={() => setAddSheet({ kind: 'mixed' })}
            >
              <span className="text-2xl">🍹</span>
              <span className="flex-1">
                <span className="block font-bold text-sm">Drink</span>
                <span className="block text-xs text-muted">słaby / średni / mocny</span>
              </span>
              <Plus size={16} className="text-muted" />
            </button>
            <button
              className="flex items-center gap-3 rounded-2xl bg-card border border-line p-4 text-left active:bg-card2"
              onClick={() => setShowCustom(true)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line text-muted">
                <Plus size={16} />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-sm">Własny</span>
                <span className="block text-xs text-muted">ml + % ręcznie</span>
              </span>
            </button>
          </div>
          <div className="mb-3">
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0E2733] border border-aqua/40 text-aqua font-bold"
              onClick={() => {
                dispatch({ type: 'addWater' })
                haptic()
                showToast('💧 Szklanka wody dopisana')
              }}
            >
              <Droplets size={17} /> Szklanka wody
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              className="h-12 rounded-2xl bg-card border border-line text-sm font-medium"
              onClick={() => {
                dispatch({ type: 'addFood', kind: 'snack' })
                haptic()
                showToast('🥜 Przekąska zapisana')
              }}
            >
              🥜 Przekąska
            </button>
            <button
              className="h-12 rounded-2xl bg-[#26200E] border border-accent/40 text-sm font-bold"
              onClick={() => {
                dispatch({ type: 'addFood', kind: 'meal' })
                haptic()
                showToast('🍔 Porządne jedzenie — index to doceni')
              }}
            >
              🍔 Zjadłem posiłek
            </button>
          </div>
        </>
      )}

      {hasBaseline && (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted">
              Sprawdź formę
              <button
                className="inline-flex items-center gap-1 text-aqua normal-case tracking-normal"
                onClick={() => setShowMethods(true)}
              >
                <Info size={13} /> metody
              </button>
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted/60">vs baseline</p>
          </div>
          <div className="flex flex-col gap-2.5 mb-6">
            {GAME_KINDS.map((k) => {
              const meta = GAME_META[k]
              const GIcon = GAME_ICONS[k]
              const latest = latestByKind[k]
              const pct = latest?.formPct
              return (
                <button
                  key={k}
                  className="flex items-center gap-3 rounded-2xl bg-card border border-line p-4 text-left active:bg-card2"
                  onClick={() => setGameMode({ plan: [k], title: session ? 'Check formy' : 'Trening', mode: 'single' })}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card2 border border-line text-mint">
                    <GIcon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-sm">{meta.name}</span>
                    <span className="block text-xs text-muted">
                      {latest ? `teraz ${meta.describe(latest.value)} · ` : ''}baseline {meta.describe(state.baseline[k] ?? 0)}
                    </span>
                  </span>
                  {pct == null ? (
                    <Play size={16} className="text-muted" />
                  ) : (
                    <span
                      className={`text-lg font-extrabold ${pct >= 85 ? 'text-mint' : pct >= 70 ? 'text-accent' : 'text-danger'}`}
                    >
                      {pct}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {session && <SessionTimeline session={session} now={now} />}

      <p className="text-[11px] leading-relaxed text-muted/80 border border-line rounded-2xl p-4">
        * Szacunek promili (uproszczony model Widmarka), Party Index oraz wyniki gier są wyłącznie orientacyjne. NIE
        służą do oceny zdolności prowadzenia pojazdów ani podejmowania ryzykownych decyzji. Po alkoholu nie prowadzisz —
        kropka. Kcal liczone z samego etanolu (7 kcal/g) — bez colek, soków i przekąsek.
      </p>

      {gameMode && <GameHost plan={gameMode.plan} title={gameMode.title} onFinish={finishGames} onCancel={() => setGameMode(null)} />}

      {practice && (
        <Modal title="Wynik treningu" onClose={() => setPractice(null)}>
          <p className="text-sm text-muted mb-2">{GAME_META[practice.kind].name}</p>
          <p className="text-3xl font-extrabold mb-1">{GAME_META[practice.kind].describe(practice.value)}</p>
          <p className="text-sm text-muted">
            To {formPct(practice.kind, practice.value, state.baseline) ?? '—'}% Twojego baseline.
          </p>
        </Modal>
      )}

      {showCustom && <CustomDrinkModal onClose={() => setShowCustom(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showQuestPick && <QuestPickModal onClose={() => setShowQuestPick(false)} />}
      {showEndSummary && session && <EndSummaryModal onClose={() => setShowEndSummary(false)} />}
      {showMethods && <MethodsInfoModal onClose={() => setShowMethods(false)} />}

      {addSheet && (
        <AddDrinkSheet
          sheet={addSheet}
          onAdd={quickAdd}
          onClose={() => setAddSheet(null)}
        />
      )}

      {toast &&
        createPortal(
          <div className="toast-in fixed bottom-24 left-1/2 z-[70] flex items-center gap-3 rounded-full bg-card2 border border-line px-5 py-3 text-sm card-shadow whitespace-nowrap">
            <span>{toast.msg}</span>
            {toast.undoId && (
              <button
                className="font-bold text-accent"
                onClick={() => {
                  dispatch({ type: 'removeDrink', id: toast.undoId! })
                  setToast(null)
                }}
              >
                Cofnij
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}

type AddSheetKind =
  | { kind: 'spread'; label: string; volumeMl: number; abv: number; icon: string }
  | { kind: 'shot' }
  | { kind: 'mixed' }

const SPREAD_STOPS = [0, 10, 20, 30, 45]
const SPREAD_LABELS = ['na raz', '10 min', '20 min', '30 min', '45 min']
/** 1 dawka = 40 ml 40% ≈ 12,6 g etanolu */
const DOSE_ALCOHOL_ML = 16

function AddDrinkSheet({
  sheet,
  onAdd,
  onClose,
}: {
  sheet: AddSheetKind
  onAdd: (label: string, volumeMl: number, abv: number, opts?: { spreadMin?: number; ts?: number; note?: string }) => void
  onClose: () => void
}) {
  const [spreadIdx, setSpreadIdx] = useState(2) // default: 20 min
  const [minutesAgo, setMinutesAgo] = useState(5)
  const [doses, setDoses] = useState(2) // drink: default średni
  const [smallGlass, setSmallGlass] = useState(false)

  if (sheet.kind === 'spread') {
    const spread = SPREAD_STOPS[spreadIdx]
    return (
      <Modal title={`${sheet.icon} ${sheet.label} ${sheet.volumeMl} ml`} onClose={onClose}>
        <p className="text-sm text-muted mb-4">W jakim tempie poszło? To zmienia krzywą promili.</p>
        <input
          type="range"
          min={0}
          max={SPREAD_STOPS.length - 1}
          step={1}
          value={spreadIdx}
          onChange={(e) => {
            setSpreadIdx(Number(e.target.value))
            haptic(6)
          }}
        />
        <div className="flex justify-between text-[10px] text-muted mb-3 px-0.5">
          {SPREAD_LABELS.map((l, i) => (
            <span key={l} className={i === spreadIdx ? 'text-mint font-bold' : ''}>
              {l}
            </span>
          ))}
        </div>
        <p className="text-center text-sm mb-5">
          {spread === 0 ? (
            <span className="text-accent font-bold">Na raz — wjedzie szybko</span>
          ) : (
            <>
              Sączone przez <span className="font-bold text-mint">~{spread} min</span>
            </>
          )}
        </p>
        <button
          className="inline-flex h-13 w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold"
          onClick={() => {
            onAdd(sheet.label, sheet.volumeMl, sheet.abv, {
              spreadMin: spread || undefined,
              note: spread ? `sączone ${spread} min` : 'na raz',
            })
            onClose()
          }}
        >
          <Plus size={17} /> Dodaj ({formatUnits(unitsOf(sheet.volumeMl, sheet.abv))} j.)
        </button>
      </Modal>
    )
  }

  if (sheet.kind === 'shot') {
    return (
      <Modal title="🥃 Shot 40 ml" onClose={onClose}>
        <p className="text-sm text-muted mb-4">
          Kiedy poszedł? Mocny alkohol wjeżdża szybko — czas ma znaczenie dla krzywej.
        </p>
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-card2 border border-line text-xl font-bold disabled:opacity-30"
            disabled={minutesAgo <= 0}
            onClick={() => setMinutesAgo((m) => Math.max(0, m - 5))}
          >
            −
          </button>
          <div className="w-32 text-center">
            <p className="text-3xl font-extrabold tabular-nums">{minutesAgo === 0 ? 'teraz' : minutesAgo}</p>
            {minutesAgo > 0 && <p className="text-xs text-muted">min temu</p>}
          </div>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-card2 border border-line text-xl font-bold disabled:opacity-30"
            disabled={minutesAgo >= 120}
            onClick={() => setMinutesAgo((m) => Math.min(120, m + 5))}
          >
            +
          </button>
        </div>
        <button
          className="inline-flex h-13 w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold"
          onClick={() => {
            onAdd('Shot', 40, 40, {
              ts: Date.now() - minutesAgo * 60_000,
              note: minutesAgo ? `${minutesAgo} min temu` : undefined,
            })
            onClose()
          }}
        >
          <Plus size={17} /> Dodaj ({formatUnits(unitsOf(40, 40))} j.)
        </button>
      </Modal>
    )
  }

  // mixed drink: strength = doses of alcohol, glass 250 ml (or small 180 ml)
  const volume = smallGlass ? 180 : 250
  const abv = Math.round(((doses * DOSE_ALCOHOL_ML) / volume) * 1000) / 10
  const strengthName = ['słaby', 'średni', 'mocny'][doses - 1]
  return (
    <Modal title="🍹 Drink" onClose={onClose}>
      <p className="text-sm text-muted mb-3">Jaka moc? Dawka = porcja 40 ml 40%.</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            className={`h-14 rounded-2xl border text-sm font-bold ${
              doses === d ? 'bg-mint text-black border-mint' : 'bg-card2 border-line'
            }`}
            onClick={() => {
              setDoses(d)
              haptic(6)
            }}
          >
            {['słaby', 'średni', 'mocny'][d - 1]}
            <span className={`block text-[10px] font-normal ${doses === d ? 'text-black/60' : 'text-muted'}`}>
              {d} {d === 1 ? 'dawka' : 'dawki'}
            </span>
          </button>
        ))}
      </div>
      <button
        className="inline-flex h-13 w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold mb-3"
        onClick={() => {
          onAdd(`Drink (${strengthName})`, volume, abv, { spreadMin: 15, note: 'sączone ~15 min' })
          onClose()
        }}
      >
        <Plus size={17} /> Dodaj ({formatUnits(unitsOf(volume, abv))} j. · {volume} ml)
      </button>
      <button
        className={`w-full text-center text-xs ${smallGlass ? 'text-mint font-bold' : 'text-muted underline'}`}
        onClick={() => setSmallGlass((s) => !s)}
      >
        {smallGlass ? '✓ mała szklanka 180 ml' : 'mała szklanka? zmień na 180 ml'}
      </button>
    </Modal>
  )
}

function SessionTimeline({ session, now }: { session: DrinkSession; now: number }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const profile = state.profile

  type FeedItem = {
    ts: number
    key: string
    icon: React.ReactNode
    text: string
    sub?: string
    drinkId?: string
  }

  const items: FeedItem[] = [
    {
      ts: session.startedAt,
      key: 'start',
      icon: <Play size={13} className="text-mint" />,
      text: 'Start sesji',
    },
    ...session.drinks.map((d) => ({
      ts: d.ts,
      key: d.id,
      icon: <span className="text-sm leading-none">{d.label.toLowerCase().includes('piwo') ? '🍺' : d.label.toLowerCase().includes('wino') ? '🍷' : d.label.toLowerCase().includes('shot') ? '🥃' : '🍹'}</span>,
      text: `${d.label} ${d.volumeMl} ml · +${formatUnits(d.units)} j.`,
      sub: d.spreadMin ? `sączone ~${d.spreadMin} min` : undefined,
      drinkId: d.id,
    })),
    ...session.water.map((w) => ({
      ts: w.ts,
      key: w.id,
      icon: <Droplets size={13} className="text-aqua" />,
      text: 'Szklanka wody',
    })),
    ...(session.food ?? []).map((f) => ({
      ts: f.ts,
      key: f.id,
      icon: <span className="text-sm leading-none">{f.kind === 'meal' ? '🍔' : '🥜'}</span>,
      text: f.kind === 'meal' ? 'Porządny posiłek' : 'Przekąska',
    })),
    ...session.checkIns.map((c, i) => ({
      ts: c.ts,
      key: `check-${i}`,
      icon: <Activity size={13} className="text-accent" />,
      text: `Check-in: ${GAME_META[c.kind].name} → ${c.formPct}% formy`,
      sub: c.recall ? `pamięć odroczona ${formatRecallScore(c.recall.correct)}/${c.recall.total}` : undefined,
    })),
  ].sort((a, b) => b.ts - a.ts)

  if (items.length <= 1) return null

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-2">Timeline imprezy</p>
      <div className="relative mb-6">
        <div className="absolute left-[52px] top-2 bottom-2 w-px bg-line" />
        <div className="flex flex-col gap-1.5">
          {items.map((it) => {
            const p = profile ? estimatePermille(session.drinks, profile, Math.min(it.ts, now)) : 0
            const idx = profile ? partyIndex(sessionIndexInput(session, profile, Math.min(it.ts, now))) : 100
            return (
              <div key={it.key} className="flex items-center gap-2.5 text-sm">
                <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">{formatClock(it.ts)}</span>
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card2 border border-line">
                  {it.icon}
                </span>
                <span className="flex-1 min-w-0 rounded-xl bg-card border border-line px-3 py-2">
                  <span className="block truncate text-[13px]">{it.text}</span>
                  {it.sub && <span className="block text-[11px] text-muted">{it.sub}</span>}
                </span>
                <span className="w-[74px] shrink-0 text-right">
                  <span className="block text-[11px] tabular-nums text-accent">{formatPermille(p)}</span>
                  <span className="block text-[11px] tabular-nums font-bold" style={{ color: indexColor(idx) }}>
                    idx {idx}
                  </span>
                </span>
                {it.drinkId ? (
                  <button
                    aria-label="usuń wpis"
                    className="shrink-0 text-muted/60"
                    onClick={() => dispatch({ type: 'removeDrink', id: it.drinkId! })}
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <span className="w-[13px] shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function QuestPickModal({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [picked, setPicked] = useState<SessionQuest[]>([{ id: 'waterDiscipline' }])

  const has = (id: SessionQuest['id']) => picked.some((q) => q.id === id)
  const targetOf = (id: SessionQuest['id']) => picked.find((q) => q.id === id)?.target

  function toggle(id: SessionQuest['id'], target?: number) {
    setPicked((prev) => {
      const rest = prev.filter((q) => q.id !== id)
      const current = prev.find((q) => q.id === id)
      if (current && current.target === target) return rest // tap again = off
      return [...rest, { id, target }]
    })
  }

  function start(quests: SessionQuest[]) {
    dispatch({ type: 'startSession', quests })
    if (state.settings.notificationsEnabled) void ensureNotifyPermission()
    onClose()
  }

  return (
    <Modal title="Challenge na tę sesję?" icon={<Target size={16} className="text-accent" />} onClose={onClose}>
      <p className="text-sm text-muted mb-4">
        Wybierz, co dziś dowozisz. Werdykt na koniec sesji — bez taryfy ulgowej.
      </p>
      <div className="flex flex-col gap-2.5 mb-5">
        {QUEST_DEFS.map((def) => {
          const QIcon = QUEST_ICONS[def.id]
          return (
          <div
            key={def.id}
            className={`rounded-2xl border p-4 ${has(def.id) ? 'bg-[#12251C] border-mint/40' : 'bg-card2 border-line'}`}
          >
            <button className="flex w-full items-start gap-3 text-left" onClick={() => def.targets ? undefined : toggle(def.id)}>
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${has(def.id) ? 'border-mint/40 text-mint' : 'border-line text-muted'}`}>
                <QIcon size={17} strokeWidth={1.9} />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-sm">{def.title(targetOf(def.id) ?? def.targets?.[1])}</span>
                <span className="block text-xs text-muted mt-0.5">{def.desc}</span>
              </span>
              {!def.targets &&
                (has(def.id) ? <Check size={17} className="text-mint" /> : <Plus size={17} className="text-muted" />)}
            </button>
            {def.targets && (
              <div className="flex gap-2 mt-3">
                {def.targets.map((t) => (
                  <button
                    key={t}
                    className={`flex-1 h-9 rounded-full text-sm font-bold border ${
                      targetOf(def.id) === t ? 'bg-mint text-black border-mint' : 'bg-card border-line text-muted'
                    }`}
                    onClick={() => toggle(def.id, t)}
                  >
                    {t} j.
                  </button>
                ))}
              </div>
            )}
          </div>
          )
        })}
      </div>
      <div className="flex gap-3">
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 py-3.5 rounded-2xl bg-mint text-black font-bold"
          onClick={() => start(picked)}
        >
          <Play size={16} fill="currentColor" /> Start {picked.length > 0 ? `(${picked.length} quest${picked.length === 1 ? '' : 'y'})` : ''}
        </button>
        <button className="h-13 py-3.5 px-4 rounded-2xl bg-card2 border border-line text-sm" onClick={() => start([])}>
          Bez questów
        </button>
      </div>
    </Modal>
  )
}

function EndSummaryModal({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const session = state.activeSession!
  const now = Date.now()
  const units = totalUnits(session.drinks)
  const permille = state.profile ? estimatePermille(session.drinks, state.profile, now) : 0
  const verdicts = evaluateQuests(session, now)
  const done = verdicts.filter((q) => q.done).length

  return (
    <Modal title="Podsumowanie sesji" icon={<Flag size={16} className="text-mint" />} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-card2 border border-line p-3">
          <p className="text-xl font-extrabold">{formatUnits(units)} j.</p>
          <p className="text-xs text-muted">
            {session.drinks.length} {session.drinks.length === 1 ? 'wpis' : session.drinks.length < 5 ? 'wpisy' : 'wpisów'} · {session.water.length}💧
          </p>
        </div>
        <div className="rounded-xl bg-card2 border border-line p-3">
          <p className="text-xl font-extrabold">{formatDuration(now - session.startedAt)}</p>
          <p className="text-xs text-muted">czas sesji</p>
        </div>
        <div className="rounded-xl bg-card2 border border-line p-3 col-span-2">
          <p className="text-xl font-extrabold text-accent">{formatPermille(permille)}</p>
          <p className="text-xs text-muted">teraz · spalanie ~0,15‰/h · zero {formatEta(permille)}</p>
        </div>
      </div>

      {verdicts.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {verdicts.map((q) => {
            const def = questDef(q.id)
            const QIcon = QUEST_ICONS[q.id]
            return (
              <div key={q.id} className="flex items-center gap-3 rounded-xl bg-card2 border border-line px-4 py-2.5 text-sm">
                <QIcon size={16} className="text-muted" />
                <span className="flex-1">{def.title(q.target)}</span>
                <span className={`inline-flex items-center gap-1 font-bold ${q.done ? 'text-mint' : 'text-danger'}`}>
                  {q.done ? <Check size={15} /> : <X size={15} />} {q.done ? 'zaliczony' : 'nie'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="flex gap-2.5 text-sm text-white/85 bg-black/25 border border-line rounded-xl px-4 py-3 mb-4 leading-relaxed">
        <Compass size={16} className="mt-0.5 shrink-0 text-muted" />
        <span>{coachSummary(units, done, verdicts.length, session.worstIndex)}</span>
      </p>

      <div className="flex gap-3">
        <button
          className="flex-1 h-12 rounded-2xl bg-danger/90 text-black font-bold"
          onClick={() => {
            dispatch({ type: 'endSession' })
            onClose()
          }}
        >
          Zakończ sesję
        </button>
        <button className="h-12 px-4 rounded-2xl bg-card2 border border-line text-sm" onClick={onClose}>
          Jeszcze nie
        </button>
      </div>
    </Modal>
  )
}

function RateYesterdayCard() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const candidate = [...state.pastSessions]
    .reverse()
    .find(
      (s) =>
        s.endedAt != null &&
        s.endedAt < startOfToday.getTime() &&
        s.endedAt > Date.now() - 7 * 24 * 3_600_000 &&
        s.selfRating == null &&
        s.drinks.length > 0,
    )
  if (!candidate) return null

  return (
    <section className="rounded-3xl bg-gradient-to-b from-[#1B2320] to-card border border-line p-5 mb-4 card-shadow">
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1">Ocena ex post</p>
      <h2 className="font-bold mb-1">Jak się trzymałeś {formatDate(candidate.startedAt)}?</h2>
      <p className="text-sm text-muted mb-3">
        Twoja ocena 1–10, na spokojnie, dzień po. Wskaźniki ({formatUnits(totalUnits(candidate.drinks))} j., index{' '}
        {candidate.worstIndex ?? '—'}) to fakty — to jest Twój komentarz do nich.
      </p>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
          <button
            key={r}
            className={`h-9 rounded-lg border text-xs font-bold ${
              r <= 3 ? 'border-danger/40 text-danger' : r <= 6 ? 'border-accent/40 text-accent' : 'border-mint/40 text-mint'
            } bg-card2`}
            onClick={() => {
              dispatch({ type: 'rateSession', id: candidate.id, rating: r })
              haptic([10, 30, 10])
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </section>
  )
}

function AlcoholFreeCard() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const streak = alcoholFreeDays(state.pastSessions)
  const target = state.alcoholFreeTarget

  return (
    <section className="rounded-3xl bg-card border border-line p-5 mb-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold">🌿 Dni bez alkoholu</h2>
        <span className="text-2xl font-extrabold text-mint">{streak ?? '—'}</span>
      </div>
      {streak == null ? (
        <p className="text-sm text-muted">Licznik ruszy po pierwszej zapisanej sesji — liczy się każdy pełny dzień bez wpisu.</p>
      ) : target ? (
        <>
          <p className="text-sm text-muted mb-2">
            Challenge: {target} dni. {streak >= target ? 'Cel dowieziony — podnieś poprzeczkę? 💪' : `Zostało ${target - streak} dni.`}
          </p>
          <div className="h-2.5 rounded-full bg-card2 overflow-hidden mb-3">
            <div className="h-full rounded-full bg-mint" style={{ width: `${Math.min(100, (streak / target) * 100)}%` }} />
          </div>
          <button className="text-xs text-muted underline" onClick={() => dispatch({ type: 'setAlcoholFreeTarget', days: undefined })}>
            usuń challenge
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted mb-3">Postaw sobie challenge — apka pilnuje sama, z danych.</p>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                className="flex-1 h-10 rounded-full bg-card2 border border-line text-sm font-bold"
                onClick={() => dispatch({ type: 'setAlcoholFreeTarget', days: d })}
              >
                {d} dni
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

/** Independent sobriety gauge: 100% = 0.0‰, 0% = 3.0‰ (linear). */
function SobrietyBar({ permille }: { permille: number }) {
  const pct = Math.round(Math.max(0, Math.min(100, (1 - permille / 3) * 100)))
  const color = pct >= 80 ? '#34D399' : pct >= 50 ? '#F5A524' : '#F87171'
  return (
    <section className="rounded-2xl bg-card border border-line px-4 py-3 mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Trzeźwość</p>
        <p className="text-sm">
          <span className="font-extrabold" style={{ color }}>{pct}%</span>
          <span className="text-muted"> · {formatPermille(permille)}</span>
        </p>
      </div>
      <div className="relative h-3 rounded-full bg-card2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease, background 0.6s ease' }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted/70">
        <span>0% = 3,0‰</span>
        {permille >= 0.01 && <span>zero {formatEta(permille)}</span>}
        <span>100% = 0,0‰</span>
      </div>
    </section>
  )
}

function ProfileCard() {
  const dispatch = useAppDispatch()
  const [weight, setWeight] = useState('80')
  const [sex, setSex] = useState<Sex>('male')
  return (
    <section className="rounded-3xl bg-card border border-line p-5 mb-4">
      <h2 className="font-bold mb-1">Twój profil</h2>
      <p className="text-sm text-muted mb-3">Waga i płeć są potrzebne do szacowania promili (Widmark).</p>
      <div className="flex gap-3 mb-3">
        <label className="flex-1 text-sm">
          <span className="block text-muted text-xs mb-1">Waga (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full h-12 rounded-xl bg-card2 border border-line px-3"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="block text-muted text-xs mb-1">Płeć</span>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className="w-full h-12 rounded-xl bg-card2 border border-line px-3"
          >
            <option value="male">Mężczyzna</option>
            <option value="female">Kobieta</option>
          </select>
        </label>
      </div>
      <button
        className="h-12 w-full rounded-2xl bg-accent text-black font-bold disabled:opacity-40"
        disabled={!(Number(weight) > 30)}
        onClick={() => dispatch({ type: 'setProfile', profile: { weightKg: Number(weight), sex } })}
      >
        Zapisz profil
      </button>
    </section>
  )
}

function CustomDrinkModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch()
  const [label, setLabel] = useState('Drink')
  const [ml, setMl] = useState('250')
  const [abv, setAbv] = useState('10')
  const valid = Number(ml) > 0 && Number(abv) > 0 && Number(abv) <= 96
  return (
    <Modal title="Własny drink" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="block text-muted text-xs mb-1">Nazwa</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full h-12 rounded-xl bg-card2 border border-line px-3" />
        </label>
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            <span className="block text-muted text-xs mb-1">Objętość (ml)</span>
            <input type="number" inputMode="numeric" value={ml} onChange={(e) => setMl(e.target.value)} className="w-full h-12 rounded-xl bg-card2 border border-line px-3" />
          </label>
          <label className="flex-1 text-sm">
            <span className="block text-muted text-xs mb-1">Moc (%)</span>
            <input type="number" inputMode="decimal" value={abv} onChange={(e) => setAbv(e.target.value)} className="w-full h-12 rounded-xl bg-card2 border border-line px-3" />
          </label>
        </div>
        {valid && (
          <p className="text-sm text-muted">= {formatUnits(unitsOf(Number(ml), Number(abv)))} jednostki</p>
        )}
        <button
          className="h-12 rounded-2xl bg-accent text-black font-bold disabled:opacity-40"
          disabled={!valid}
          onClick={() => {
            dispatch({ type: 'addDrink', label: label || 'Drink', volumeMl: Number(ml), abv: Number(abv) })
            onClose()
          }}
        >
          Dodaj
        </button>
      </div>
    </Modal>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const p = state.profile
  const [weight, setWeight] = useState(String(p?.weightKg ?? 80))
  const [sex, setSex] = useState<Sex>(p?.sex ?? 'male')
  const [showMethods, setShowMethods] = useState(false)

  if (showMethods) return <MethodsInfoModal onClose={() => setShowMethods(false)} />

  return (
    <Modal title="Ustawienia" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            <span className="block text-muted text-xs mb-1">Waga (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={() => Number(weight) > 30 && dispatch({ type: 'setProfile', profile: { weightKg: Number(weight), sex } })}
              className="w-full h-12 rounded-xl bg-card2 border border-line px-3"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="block text-muted text-xs mb-1">Płeć</span>
            <select
              value={sex}
              onChange={(e) => {
                const s = e.target.value as Sex
                setSex(s)
                if (Number(weight) > 30) dispatch({ type: 'setProfile', profile: { weightKg: Number(weight), sex: s } })
              }}
              className="w-full h-12 rounded-xl bg-card2 border border-line px-3"
            >
              <option value="male">Mężczyzna</option>
              <option value="female">Kobieta</option>
            </select>
          </label>
        </div>

        <label className="text-sm">
          <span className="block text-muted text-xs mb-1">Check-in co</span>
          <select
            value={state.settings.checkInMinutes}
            onChange={(e) => dispatch({ type: 'setSettings', settings: { checkInMinutes: Number(e.target.value) } })}
            className="w-full h-12 rounded-xl bg-card2 border border-line px-3"
          >
            <option value={30}>30 minut</option>
            <option value={45}>45 minut</option>
            <option value={60}>60 minut</option>
            <option value={90}>90 minut</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-sm rounded-xl bg-card2 border border-line px-4 py-3">
          <span>
            Powiadomienia o check-inie
            {!notificationsSupported() && <span className="block text-xs text-muted">Niedostępne w tej przeglądarce</span>}
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#34D399]"
            checked={state.settings.notificationsEnabled}
            disabled={!notificationsSupported()}
            onChange={async (e) => {
              const on = e.target.checked
              if (on) {
                const ok = await ensureNotifyPermission()
                dispatch({ type: 'setSettings', settings: { notificationsEnabled: ok } })
              } else {
                dispatch({ type: 'setSettings', settings: { notificationsEnabled: false } })
              }
            }}
          />
        </label>

        <label className="flex items-center justify-between text-sm rounded-xl bg-card2 border border-line px-4 py-3">
          <span>
            Pamięć odroczona (słowa)
            <span className="block text-xs text-muted">3 słowa do zapamiętania między check-inami</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#34D399]"
            checked={state.settings.memoRecallEnabled}
            onChange={(e) => dispatch({ type: 'setSettings', settings: { memoRecallEnabled: e.target.checked } })}
          />
        </label>

        <label className="flex items-center justify-between text-sm rounded-xl bg-card2 border border-line px-4 py-3">
          <span>
            Refleks PRO
            <span className="block text-xs text-muted">18 pól — traf w to jedno, które się zapali. Po zmianie przelicz baseline.</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#34D399]"
            checked={state.settings.reflexPro}
            onChange={(e) => dispatch({ type: 'setSettings', settings: { reflexPro: e.target.checked } })}
          />
        </label>

        <button
          className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-card2 border border-line text-sm font-medium text-left px-4"
          onClick={() => setShowMethods(true)}
        >
          <Info size={16} className="text-aqua shrink-0" /> Jak mierzymy formę — metody, zalety, wady
        </button>

        <p className="text-xs text-muted">
          Powiadomienia lokalne działają, gdy apka jest otwarta lub zainstalowana na ekranie głównym (Android). Na
          iOS dodaj apkę do ekranu głównego — w otwartej apce check-in i tak wyskoczy jako modal.
        </p>

        <div className="border-t border-line pt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-3">Dane</p>
          <div className="flex gap-3">
            <button
              className="flex-1 h-11 rounded-xl bg-card2 border border-line text-sm font-medium"
              onClick={() => {
                const blob = new Blob([localStorage.getItem('drink-tracker/v1') ?? '{}'], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `drink-responsible-backup-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(a.href)
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Download size={15} /> Eksport JSON
              </span>
            </button>
            <label className="flex-1 h-11 rounded-xl bg-card2 border border-line text-sm font-medium flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={15} /> Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const imported = sanitizeImportedState(JSON.parse(await file.text()))
                    if (!imported) throw new Error('bad shape')
                    if (confirm('Nadpisać WSZYSTKIE obecne dane danymi z backupu?')) {
                      dispatch({ type: 'importState', state: imported })
                      onClose()
                    }
                  } catch {
                    alert('Ten plik nie wygląda na backup Drink Responsible.')
                  } finally {
                    e.target.value = ''
                  }
                }}
              />
            </label>
          </div>
          <p className="text-[10px] text-muted/70 mt-2">Dane żyją tylko w tej przeglądarce — rób backup przed czyszczeniem.</p>
          <button
            className="w-full h-11 mt-3 rounded-xl bg-card2 border border-line text-sm font-medium"
            onClick={() => {
              if (confirm('Skasować baseline i zmierzyć od nowa? (zalecane po zmianie mechaniki gier)')) {
                dispatch({ type: 'setBaseline', baseline: {} })
                onClose()
              }
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <RefreshCw size={15} /> Przelicz baseline od nowa
            </span>
          </button>
        </div>

        <div className="border-t border-dashed border-line pt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-1">Tryb testowy</p>
          <p className="text-[11px] text-muted/70 mb-3">
            Wgraj przykładowy baseline (standardowe wartości), żeby od razu odpalić sesję i potestować flow bez
            kalibracji. Później możesz zmierzyć swój na trzeźwo.
          </p>
          <button
            className="w-full h-11 rounded-xl bg-[#2E2510] border border-accent/40 text-sm font-bold text-accent"
            onClick={() => {
              dispatch({
                type: 'setBaseline',
                baseline: { reflex: 320, trace: 13000, memory: 6, calibratedAt: Date.now() },
              })
              if (!state.profile) dispatch({ type: 'setProfile', profile: { weightKg: 80, sex: 'male' } })
              onClose()
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <FlaskConical size={15} /> Wgraj przykładowy baseline
            </span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
