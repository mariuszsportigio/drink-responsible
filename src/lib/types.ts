export type Sex = 'male' | 'female'

export interface Profile {
  weightKg: number
  sex: Sex
}

export type GameKind = 'reflex' | 'trace' | 'memory'

export interface Baseline {
  /** median reaction time in ms (lower = better) */
  reflex?: number
  /** median trace score 0-100 (higher = better) */
  trace?: number
  /** median completed sequence length (higher = better) */
  memory?: number
  calibratedAt?: number
}

export interface DrinkEntry {
  id: string
  ts: number
  label: string
  volumeMl: number
  abv: number
  units: number
}

export interface WaterEntry {
  id: string
  ts: number
}

export interface CheckIn {
  ts: number
  kind: GameKind
  value: number
  formPct: number
  /** delayed-recall quiz result (words remembered from the previous check-in) */
  recall?: { correct: number; total: number }
}

export type QuestId = 'maxUnits' | 'waterDiscipline' | 'formAbove70' | 'slowPace'

export interface SessionQuest {
  id: QuestId
  target?: number
  /** verdict, filled in when the session ends */
  done?: boolean
}

export interface DrinkSession {
  id: string
  startedAt: number
  endedAt?: number
  drinks: DrinkEntry[]
  water: WaterEntry[]
  checkIns: CheckIn[]
  quests?: SessionQuest[]
  /** words to recall at the next check-in */
  memoWords?: string[]
}

export interface Mit {
  date: string // YYYY-MM-DD local
  text: string
  committedAt: number
  doneAt?: number
}

export interface Habit {
  id: string
  name: string
  doneDates: string[] // YYYY-MM-DD local
}

export interface Settings {
  checkInMinutes: number
  notificationsEnabled: boolean
  /** delayed-recall word quiz during check-ins */
  memoRecallEnabled: boolean
}

export interface AppState {
  profile?: Profile
  baseline: Baseline
  activeSession?: DrinkSession
  pastSessions: DrinkSession[]
  mits: Mit[]
  habits: Habit[]
  settings: Settings
  /** target for the "days without alcohol" challenge */
  alcoholFreeTarget?: number
}

export const initialState: AppState = {
  baseline: {},
  pastSessions: [],
  mits: [],
  habits: [],
  settings: { checkInMinutes: 60, notificationsEnabled: false, memoRecallEnabled: true },
}
