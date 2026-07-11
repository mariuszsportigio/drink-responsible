# Drink Responsible — Personal OS

Prywatna PWA (single user) — **Party Mood Tracker**: kokpit sesji z Party Index, licznik jednostek
i promili (Widmark), woda/jedzenie/kcal, mini-gierki z baseline, questy, coach z bazą tekstów,
kalendarz miesiąca i oceny ex post. Realna apka — nie robi z użytkownika świętoszka, pomaga trzymać formę.

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
- **Baseline**: 3 gry × 3 rundy na trzeźwo (mediana), odświeżanie co ~30 dni (reset w ustawieniach).
- **Gry**: Refleks (światła czerwone→zielone, falstart = kara), Koordynacja (ścieżka), Pamięć (Simon).
  Opis metod z zaletami/wadami: przycisk „ⓘ metody" w apce ([src/components/MethodsInfo.tsx](src/components/MethodsInfo.tsx)).
- **Check-in co 1h**: powiadomienie/modal → quiz pamięci odroczonej (3 słowa z poprzedniego check-inu,
  wybór z chipów w kolejności — [src/lib/recall.ts](src/lib/recall.ts)) → losowa gierka → spowiedź → nowe słowa.
- **Oś czasu sesji** ([src/components/SessionChart.tsx](src/components/SessionChart.tsx)): krzywa ‰ z projekcją
  spalania, forma % z check-inów, markery 🍺💧.
- **Questy** ([src/lib/quests.ts](src/lib/quests.ts)): limit jednostek (3/4/6), woda w ryzach, stabilna forma ≥70%,
  spokojne tempo ≤1,5 j./h — wybierane przed sesją, uczciwy werdykt na końcu; do tego challenge „dni bez alkoholu" (7/14/30).
- **Party Index** ([src/lib/partyIndex.ts](src/lib/partyIndex.ts)): 100 = trzeźwy+nawodniony+najedzony+testy
  w normie; ludzka kalibracja (4 piwa/3h zadbane ≈ 90, 8 piw/7h ≈ 78, 1‰ ≈ 72); shoty (≥30%) karane mocniej.
  Kokpit: INDEX/PROMILE/FORMA przełączane tapem/swipe. WorstIndex sesji → kalendarz „dobrych dni".
- **Coach** ([src/lib/coachLines.ts](src/lib/coachLines.ts)): ~80 tekstów w pulach wg stref indexu,
  rotacja co 10 min; overlaye: spike po mocnym alkoholu, pusty żołądek, słaba pamięć. Nigdy „możesz więcej".
- **Kalorie**: kcal z etanolu (7 kcal/g) w kokpicie i statach. **Ocena ex post 1-10** następnego dnia.
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
