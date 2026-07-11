import { createContext, useContext, useEffect, useReducer, type ReactNode, type Dispatch } from 'react'
import { initialState, type AppState, type Baseline, type CheckIn, type Profile, type SessionQuest, type Settings } from '../lib/types'
import { unitsOf } from '../lib/alcohol'
import { evaluateQuests } from '../lib/quests'
import { sessionWorstIndex } from '../lib/partyIndex'
import { dateStr, uid } from '../lib/util'

const STORAGE_KEY = 'drink-tracker/v1'

export type Action =
  | { type: 'setProfile'; profile: Profile }
  | { type: 'setBaseline'; baseline: Baseline }
  | { type: 'startSession'; quests: SessionQuest[] }
  | { type: 'endSession' }
  | { type: 'setAlcoholFreeTarget'; days?: number }
  | { type: 'addDrink'; label: string; volumeMl: number; abv: number; ts?: number; id?: string }
  | { type: 'removeDrink'; id: string }
  | { type: 'addWater' }
  | { type: 'addFood'; kind: 'snack' | 'meal' }
  | { type: 'rateSession'; id: string; rating: number }
  | { type: 'recordCheckIn'; checkIn: CheckIn }
  | { type: 'setMemoWords'; words: string[] | undefined }
  | { type: 'commitMit'; text: string }
  | { type: 'completeMit' }
  | { type: 'addHabit'; name: string }
  | { type: 'removeHabit'; id: string }
  | { type: 'toggleHabit'; id: string }
  | { type: 'setSettings'; settings: Partial<Settings> }
  | { type: 'importState'; state: AppState }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setProfile':
      return { ...state, profile: action.profile }
    case 'setBaseline':
      return { ...state, baseline: action.baseline }
    case 'startSession':
      if (state.activeSession) return state
      return {
        ...state,
        activeSession: { id: uid(), startedAt: Date.now(), drinks: [], water: [], checkIns: [], quests: action.quests },
      }
    case 'endSession': {
      if (!state.activeSession) return state
      const ended = { ...state.activeSession, endedAt: Date.now() }
      ended.quests = evaluateQuests(ended, ended.endedAt)
      if (state.profile) ended.worstIndex = sessionWorstIndex(ended, state.profile)
      return { ...state, activeSession: undefined, pastSessions: [...state.pastSessions, ended] }
    }
    case 'setAlcoholFreeTarget':
      return { ...state, alcoholFreeTarget: action.days }
    case 'addDrink': {
      if (!state.activeSession) return state
      const drink = {
        id: action.id ?? uid(),
        ts: action.ts ?? Date.now(),
        label: action.label,
        volumeMl: action.volumeMl,
        abv: action.abv,
        units: unitsOf(action.volumeMl, action.abv),
      }
      return {
        ...state,
        activeSession: { ...state.activeSession, drinks: [...state.activeSession.drinks, drink] },
      }
    }
    case 'removeDrink': {
      if (!state.activeSession) return state
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          drinks: state.activeSession.drinks.filter((d) => d.id !== action.id),
        },
      }
    }
    case 'addWater': {
      if (!state.activeSession) return state
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          water: [...state.activeSession.water, { id: uid(), ts: Date.now() }],
        },
      }
    }
    case 'recordCheckIn': {
      if (!state.activeSession) return state
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          checkIns: [...state.activeSession.checkIns, action.checkIn],
        },
      }
    }
    case 'addFood': {
      if (!state.activeSession) return state
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          food: [...(state.activeSession.food ?? []), { id: uid(), ts: Date.now(), kind: action.kind }],
        },
      }
    }
    case 'rateSession':
      return {
        ...state,
        pastSessions: state.pastSessions.map((s) =>
          s.id === action.id ? { ...s, selfRating: Math.max(1, Math.min(10, action.rating)) } : s,
        ),
      }
    case 'setMemoWords': {
      if (!state.activeSession) return state
      return { ...state, activeSession: { ...state.activeSession, memoWords: action.words } }
    }
    case 'commitMit': {
      const today = dateStr()
      if (state.mits.some((m) => m.date === today)) return state
      return { ...state, mits: [...state.mits, { date: today, text: action.text, committedAt: Date.now() }] }
    }
    case 'completeMit': {
      const today = dateStr()
      return {
        ...state,
        mits: state.mits.map((m) => (m.date === today && !m.doneAt ? { ...m, doneAt: Date.now() } : m)),
      }
    }
    case 'addHabit':
      return { ...state, habits: [...state.habits, { id: uid(), name: action.name, doneDates: [] }] }
    case 'removeHabit':
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id) }
    case 'toggleHabit': {
      const today = dateStr()
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h
          const done = h.doneDates.includes(today)
          return { ...h, doneDates: done ? h.doneDates.filter((d) => d !== today) : [...h.doneDates, today] }
        }),
      }
    }
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'importState':
      return action.state
  }
}

/** Merge an untrusted parsed backup into a valid AppState (same rules as load()). */
export function sanitizeImportedState(parsed: unknown): AppState | null {
  if (typeof parsed !== 'object' || parsed === null) return null
  const p = parsed as Partial<AppState>
  if (!Array.isArray(p.pastSessions ?? []) || !Array.isArray(p.mits ?? []) || !Array.isArray(p.habits ?? [])) return null
  return { ...initialState, ...p, settings: { ...initialState.settings, ...p.settings } }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...initialState, ...parsed, settings: { ...initialState.settings, ...parsed.settings } }
  } catch {
    return initialState
  }
}

const StateCtx = createContext<AppState>(initialState)
const DispatchCtx = createContext<Dispatch<Action>>(() => {})

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full / private mode — keep running in-memory
    }
  }, [state])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useAppState(): AppState {
  return useContext(StateCtx)
}

export function useAppDispatch(): Dispatch<Action> {
  return useContext(DispatchCtx)
}
