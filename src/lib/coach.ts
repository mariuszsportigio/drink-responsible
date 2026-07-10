import { ELIMINATION_PER_HOUR } from './alcohol'

export interface CoachCtx {
  units: number
  permille: number
  hours: number
  deficit: number
  lastForm?: number
}

/** Estimated time until ~0.00‰ at the fixed Widmark burn rate. */
export function soberEta(permille: number, at: number = Date.now()): { hours: number; at: Date } {
  const hours = permille / ELIMINATION_PER_HOUR
  return { hours, at: new Date(at + hours * 3_600_000) }
}

export function formatEta(permille: number): string {
  if (permille < 0.01) return 'teraz'
  const eta = soberEta(permille)
  const clock = eta.at.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  return eta.hours >= 24 ? `za ~${Math.round(eta.hours)} h` : `~${clock}${eta.at.getDate() !== new Date().getDate() ? ' (jutro)' : ''}`
}

function pick(variants: string[], seed: number): string {
  return variants[Math.abs(seed) % variants.length]
}

/**
 * Honest, no-fluff commentary on the current session state.
 * Rules ordered by severity; never says "you can drink more".
 */
export function coachLine(ctx: CoachCtx): string {
  const { units, permille, hours, deficit, lastForm } = ctx
  const seed = Math.floor(hours * 2) + Math.round(units * 10)
  const p = permille.toLocaleString('pl-PL', { maximumFractionDigits: 2 })
  const tempo = hours >= 0.75 ? units / hours : 0

  if (permille >= 1.5) {
    return pick(
      [
        `${p}‰ — to już nie „luz", to zjazd. Koniec dolewek, woda i coś do jedzenia.`,
        `Jedziesz na grubo (${p}‰). Nic mądrego dziś już z tego nie będzie — hamuj.`,
      ],
      seed,
    )
  }
  if (lastForm != null && lastForm < 70) {
    return pick(
      [
        `Forma ${lastForm}% baseline. Ciało już głosuje przeciw — słuchaj go, nie kolegów.`,
        `Refleks/koordynacja lecą w dół (${lastForm}%). To jest ten moment, w którym kończy się „kontrola".`,
      ],
      seed,
    )
  }
  if (deficit >= 2) {
    return pick(
      [
        `Zalegasz ${deficit} szklanki wody. Jutrzejszy Ty właśnie pisze do Ciebie z pretensjami.`,
        `Alkohol:woda wygląda słabo — ${deficit} szklanki do tyłu. Nadrób, zanim licznik pójdzie wyżej.`,
      ],
      seed,
    )
  }
  if (tempo > 2 && hours >= 0.75) {
    return pick(
      [
        `Tempo ${tempo.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} j./h — sprint, nie maraton. Rozciągnij następnego drinka.`,
        `Za szybko. Przy tym tempie za 2 h licznik będzie wyglądał brzydko — zwolnij teraz, nie potem.`,
      ],
      seed,
    )
  }
  if (permille >= 0.8) {
    return pick(
      [
        `${p}‰ na liczniku. Kierownica odpada do jutra — spalasz ~0,15‰/h, zero ${formatEta(permille)}.`,
        `Solidnie ponad 0,5‰ (${p}). Decyzje ważniejsze niż wybór playlisty odłóż na jutro.`,
      ],
      seed,
    )
  }
  if (units > 0) {
    return pick(
      [
        `Kontrola jest: ${units.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} j., forma trzyma. Tak wygląda picie po dorosłemu.`,
        `Spokojny przebieg. Utrzymaj wodę i tempo, a jutro wstaniesz jak człowiek.`,
      ],
      seed,
    )
  }
  return pick(
    [
      'Zero jednostek na liczniku. Najlepszy wynik wieczoru wciąż do wzięcia.',
      'Sesja czysta jak łza. Woda liczy się podwójnie, kiedy nikt nie patrzy.',
    ],
    seed,
  )
}

/** Closing line for the end-of-session summary. */
export function coachSummary(units: number, questsDone: number, questsTotal: number): string {
  if (units === 0) return 'Sesja bez alkoholu — to się liczy do streaka. Szacun.'
  if (questsTotal > 0 && questsDone === questsTotal) return `Wszystkie questy zaliczone (${questsDone}/${questsTotal}). Plan > impuls. Dokładnie tak.`
  if (questsTotal > 0 && questsDone === 0) return `Questy 0/${questsTotal}. Nie tragedia, ale dane nie kłamią — następnym razem postaw niższy próg i go dowieź.`
  if (questsTotal > 0) return `Questy ${questsDone}/${questsTotal}. Częściowa kontrola to wciąż kontrola — jutro spójrz na wykres i wyciągnij wnioski.`
  if (units <= 4) return 'Umiarkowanie i z pomiarem. Więcej takich sesji.'
  return 'Sporo tego było. Woda przed snem, a jutro zero — dane z tej sesji zostają w statystykach.'
}
