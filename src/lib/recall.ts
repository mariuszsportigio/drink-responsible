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

/** Positions matched exactly (order counts). */
export function gradeRecall(picked: string[], words: string[]): number {
  return words.reduce((score, w, i) => score + (picked[i] === w ? 1 : 0), 0)
}

export function recallComment(correct: number, total: number): string {
  if (correct === total) return 'Pamięć jak sejf. 🔒'
  if (correct >= total - 1) return 'Prawie komplet — jeszcze kontaktujesz. 👌'
  if (correct >= 1) return 'Luki w pamięci rosną. Uważaj, bo zaczniesz powtarzać te same historie. 😬'
  return 'Zero z trzech. Godzinę temu też Ci się wydawało, że wszystko pamiętasz. 💀'
}
