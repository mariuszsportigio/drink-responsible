/** Delayed-recall test: 3 words assigned at one check-in, quizzed at the next (Duolingo-style chips). */

export const WORD_POOL = [
  'kot', 'most', 'żaba', 'dom', 'wilk', 'ser', 'klucz', 'rower', 'chmura', 'stół',
  'nóż', 'lampa', 'góra', 'rzeka', 'okno', 'but', 'liść', 'księżyc', 'młot', 'kubek',
  'sowa', 'deska', 'ogień', 'piasek', 'wąż', 'zamek', 'kwiat', 'śnieg', 'beczka', 'żagiel',
  'orzech', 'cegła', 'sznur', 'wiadro', 'pióro', 'koral', 'tygrys', 'balon', 'zegar', 'magnes',
]

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickMemoWords(count = 3): string[] {
  return shuffled(WORD_POOL).slice(0, count)
}

/** Target words + distractors, shuffled into a chip grid. */
export function buildRecallChips(words: string[], total = 9): string[] {
  const distractors = shuffled(WORD_POOL.filter((w) => !words.includes(w))).slice(0, Math.max(0, total - words.length))
  return shuffled([...words, ...distractors])
}

export type RecallSlot = 'exact' | 'misplaced' | 'miss'

/** Per-slot verdict: right word in the right place / right word wrong place / wrong word. */
export function gradeRecallSlots(picked: string[], words: string[]): RecallSlot[] {
  return words.map((w, i) => (picked[i] === w ? 'exact' : words.includes(picked[i]) ? 'misplaced' : 'miss'))
}

/** 1 pkt per exact position, 0.5 pkt for a target word in the wrong slot (max = words.length). */
export function gradeRecall(picked: string[], words: string[]): number {
  return gradeRecallSlots(picked, words).reduce((s, v) => s + (v === 'exact' ? 1 : v === 'misplaced' ? 0.5 : 0), 0)
}

/** "2.5" → "2,5" for Polish UI. */
export function formatRecallScore(score: number): string {
  return String(score).replace('.', ',')
}

export function recallComment(score: number, total: number): string {
  if (score === total) return 'Pamięć jak sejf. 🔒'
  if (score >= total - 1) return 'Prawie komplet — jeszcze kontaktujesz. 👌'
  if (score >= 1) return 'Luki w pamięci rosną. Uważaj, bo zaczniesz powtarzać te same historie. 😬'
  if (score > 0) return 'Coś tam świta, ale kolejność odpłynęła w siną dal. 🌊'
  return 'Zero z trzech. Godzinę temu też Ci się wydawało, że wszystko pamiętasz. 💀'
}
