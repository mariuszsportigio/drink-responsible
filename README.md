# Drink Responsible — Personal OS

Prywatna PWA (single user): fokus dnia (MIT), nawyki, statystyki i moduł **Drink Responsible**
z licznikiem jednostek, szacunkiem promili (Widmark), wodą, mini-gierkami, questami i coachem.

**Live: https://mariuszsportigio.github.io/drink-responsible/**

UI po polsku, kod i dane po angielsku. Dane wyłącznie w `localStorage` na urządzeniu —
w repo i na serwerach nie ma żadnych danych osobistych.

## Instalacja na telefonie

1. Otwórz https://mariuszsportigio.github.io/drink-responsible/
2. **iOS (Safari):** Udostępnij → „Dodaj do ekranu początkowego" (push wymaga iOS 16.4+ i instalacji na ekranie).
3. **Android (Chrome):** monit „Zainstaluj aplikację" albo ⋮ → „Dodaj do ekranu głównego".
4. W apce: ⚙️ → włącz „Powiadomienia o check-inie".

## Architektura Web Push (zero własnego serwera)

```
PWA (telefon) ──publikuje stan sesji + subskrypcję──▶ ntfy.sh/<losowy-topic>
                                                          ▲        │
GitHub Actions cron (co 15 min) ──poll────────────────────┘        │
        │ sesja aktywna + minęła godzina?                          │
        └──▶ Web Push (VAPID) ──▶ service worker ──▶ powiadomienie 📳
             + marker "notified" do ntfy ──────────────────────────┘
```

- [.github/workflows/push-cron.yml](.github/workflows/push-cron.yml) — cron
- [.github/push-agent/send-checkins.mjs](.github/push-agent/send-checkins.mjs) — logika wysyłki
- [src/components/PushSync.tsx](src/components/PushSync.tsx) + [src/lib/push.ts](src/lib/push.ts) — strona klienta
- [src/sw.ts](src/sw.ts) — service worker (precache + push + klik w powiadomienie)
- Sekrety repo: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `NTFY_TOPIC`

Ograniczenia (świadome): cron GitHuba ma jitter (push może przyjść 60–75 min po starcie godziny);
scheduled workflows są auto-wyłączane po ~60 dniach bez aktywności w repo (wtedy: Actions → enable);
topic ntfy jest „secret by obscurity" — kto go zna, widzi znaczniki czasu sesji i może wywołać
powiadomienie, nic więcej. W apce check-in i tak zawsze wyskoczy jako modal po powrocie.

## Deploy

Automatyczny: push na `main` → workflow `deploy.yml` → GitHub Pages. Ręcznie: `gh workflow run deploy.yml`.

```bash
npm install
npm run dev        # http://localhost:5173/drink-responsible/
npm run build      # tsc + vite + service worker → dist/
npm run icons      # regeneracja ikon PWA
```

## Jak liczy

- **Jednostka** = 10 g czystego etanolu (piwo 500 ml 5% ≈ 2 j., wino 150 ml ≈ 1,4 j., shot 40 ml ≈ 1,3 j.).
- **Promile**: uproszczony Widmark — gramy/(masa × r), r = 0,68 (M)/0,55 (K), **spalanie 0,15‰/h**
  liczone po osi czasu drinków; UI pokazuje szacowaną godzinę zera ([src/lib/alcohol.ts](src/lib/alcohol.ts), [src/lib/coach.ts](src/lib/coach.ts)).
- **Baseline**: 3 gry × 3 rundy na trzeźwo (mediana), odświeżanie co ~30 dni.
- **Check-in co 1h**: powiadomienie/modal → losowa gierka → spowiedź → forma % vs baseline.
- **Questy** ([src/lib/quests.ts](src/lib/quests.ts)): limit jednostek (3/4/6), woda w ryzach, stabilna forma ≥70%,
  spokojne tempo ≤1,5 j./h — wybierane przed sesją, uczciwy werdykt na końcu; do tego challenge „dni bez alkoholu" (7/14/30).
- **Coach** ([src/lib/coach.ts](src/lib/coach.ts)): konkretne, szczere komentarze wg priorytetu
  (promile ≥1,5 → forma <70% → zaległa woda → tempo → promile ≥0,8 → pochwała). Nigdy „możesz więcej".
- Wyniki i szacunki są orientacyjne — disclaimer w UI; po alkoholu nie prowadzisz, kropka.

## Struktura

```
src/lib/        typy, alcohol (jednostki+Widmark), games, quests, coach, push, notify, util
src/state/      store: React context + reducer + persist (localStorage: drink-tracker/v1)
src/games/      ReflexGame, TraceGame (canvas), MemoryGame (Simon), GameHost
src/screens/    DrinkScreen, TodayScreen (MIT), HabitsScreen, StatsScreen
src/components/ Ring, Modal, TabBar, CheckInManager, PushSync
src/sw.ts       custom service worker (injectManifest)
.github/        deploy.yml (Pages), push-cron.yml + push-agent/ (web push)
```

## Roadmapa

- [ ] Supabase: auth + sync między urządzeniami (zamiast ntfy — wtedy prywatny kanał)
- [ ] Wykres formy naniesiony na spożycie w osi czasu sesji
- [ ] Propozycja sesji wieczorem / wykrywanie wzorców
- [ ] Eksport danych (JSON/CSV)
