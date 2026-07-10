# Drink Responsible — Personal OS

Prywatna PWA (single user): fokus dnia (MIT), nawyki, statystyki i moduł **Drink Responsible**
z licznikiem jednostek, szacunkiem promili (Widmark), wodą i mini-gierkami sprawdzającymi formę.

UI po polsku, kod i dane po angielsku. Całość działa **offline** — stan w `localStorage`,
zero backendu (Supabase można dołożyć później jako sync).

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # produkcja → dist/ (tsc + vite + service worker)
npm run preview    # podgląd builda
npm run icons      # regeneracja ikon PWA (public/pwa-*.png)
```

## Instalacja na telefonie

1. Wystaw `dist/` pod HTTPS (np. `npx serve dist`, Cloudflare Pages, Netlify…).
   Service worker i powiadomienia wymagają HTTPS (localhost jest zwolniony).
2. **iOS (Safari):** Udostępnij → „Dodaj do ekranu początkowego". Powiadomienia Web Push
   na iOS działają tylko dla apki dodanej do ekranu głównego (iOS 16.4+).
3. **Android (Chrome):** monit „Zainstaluj aplikację" albo menu ⋮ → „Dodaj do ekranu głównego".

## Jak to działa

- **Jednostka** = 10 g czystego etanolu (piwo 500 ml 5% ≈ 2 j., wino 150 ml 12% ≈ 1,4 j., shot 40 ml 40% ≈ 1,3 j.).
- **Promile**: uproszczony Widmark — suma gramów / (masa × r), r = 0,68 (M) / 0,55 (K),
  eliminacja 0,15‰/h liczona po osi czasu drinków ([src/lib/alcohol.ts](src/lib/alcohol.ts)).
  Wyłącznie orientacyjnie — disclaimer w UI jest częścią specyfikacji, nie ozdobą.
- **Baseline**: 3 gry × 3 rundy na trzeźwo, zapis median; odświeżanie sugerowane co 30 dni.
- **Check-in co 1h** (konfigurowalne 30–90 min): powiadomienie + modal → losowa gierka →
  „spowiedź" (uzupełnienie drinków/wody z ostatniej godziny).
- **Forma %** = wynik vs baseline (refleks: baseline/teraz; koordynacja i pamięć: teraz/baseline), cap 125%.
- Przy formie < 70%: komunikat „woda + zwolnij" — apka nigdy nie mówi „możesz więcej".

## Ograniczenie powiadomień (świadoma decyzja)

Bez serwera push powiadomienia lokalne odpalają się tylko, gdy apka żyje
(otwarta karta / zainstalowana PWA niedawno aktywna). Check-in i tak zawsze pokaże się
jako modal po powrocie do apki (timer liczony od danych, nie od `setTimeout`).
Pełny push przy zamkniętej apce = przyszły krok: Supabase Edge Function + Web Push + pg_cron.

## Struktura

```
src/lib/        typy, alkohol (jednostki+Widmark), gry (formPct), notyfikacje, utils
src/state/      store: React context + reducer + persist do localStorage (klucz drink-tracker/v1)
src/games/      ReflexGame, TraceGame (canvas), MemoryGame (Simon), GameHost (kalibracja/check-in)
src/screens/    DrinkScreen, TodayScreen (MIT), HabitsScreen, StatsScreen (Recharts)
src/components/ Ring, Modal, TabBar, CheckInManager (godzinowy check-in)
scripts/        gen-icons.mjs — generator ikon PNG bez zależności
```

## Roadmapa (z wizji)

- [ ] Supabase: auth (whitelist e-maila), sync sesji między urządzeniami
- [ ] Web Push przez Edge Function + pg_cron (check-in przy zamkniętej apce)
- [ ] Wykres formy naniesiony na spożycie w osi czasu sesji
- [ ] Propozycja sesji wieczorem / wykrywanie wzorców
- [ ] Eksport danych (JSON/CSV)
