import type { IndexZone } from './partyIndex'

/**
 * Coach line pools — rotated by a 10-minute time bucket so there's no boredom
 * and no flicker. Tone: real, hero-framing ("Ty to kontrolujesz"), sometimes
 * funny, sometimes serious, occasional tomorrow-reminders. Never preachy,
 * never "you can drink more".
 */
export interface LineCtx {
  /** permille formatted pl-PL, e.g. "0,84" */
  p: string
  /** sober ETA, e.g. "~02:15" */
  eta: string
  units: string
  deficit: number
  kcal: number
}

type Line = (c: LineCtx) => string

export const ZONE_LINES: Record<IndexZone, Line[]> = {
  clean: [
    () => 'Zero na liczniku. Każda godzina w tym stanie to czysty bonus dla jutrzejszego Ciebie.',
    () => 'Sesja czysta. Woda liczy się podwójnie, kiedy nikt nie patrzy. 😉',
    () => 'Najlepszy wynik wieczoru wciąż do wzięcia: dobra zabawa bez licznika.',
    () => 'Trzeźwy kapitan na mostku. Statek płynie prosto. ⚓',
    () => 'Nic nie musisz. To Ty decydujesz, kiedy i czy w ogóle — i to jest właśnie kontrola.',
    () => 'Pamiętasz każdą rozmowę z ostatniej godziny. Luksus, którego nie docenia się do rana.',
    () => 'Zero promili, pełna pamięć, pełny refleks. Tak wygląda pełna talia w ręku.',
    () => 'Dzień bez alkoholu = darmowy bonus do jutrzejszej formy. Licznik streaka to widzi.',
  ],
  ideal: [
    (c) => `Idealna strefa (${c.p}‰). Dobra zabawa trwa — trzymaj to tempo i nie podkręcaj.`,
    () => 'To jest TEN moment wieczoru. Humor jest, kontrola jest. Sztuka polega na tym, żeby tu zostać.',
    (c) => `Kokpit zielony, ${c.units} j. na pokładzie. Pilot nadal Ty. ✈️`,
    () => 'Ładnie się trzymasz — brawo! 🏆 Woda w obiegu, tempo ludzkie.',
    () => 'Tu się kończy picie, a zaczyna smakowanie. Zostań na tym poziomie, mistrzu.',
    (c) => `${c.p}‰ — dokładnie tyle, ile trzeba do dobrego humoru. Więcej wcale nie znaczy weselej.`,
    () => 'Gdyby każda sesja tak wyglądała, ta apka byłaby bezrobotna. Szacun.',
    () => 'Jutro wstaniesz jak człowiek i to będzie Twoja zasługa. Dzisiejsza, dokładnie z tej chwili.',
    () => 'Tempo maratończyka, nie sprintera. Tak się wygrywa wieczory. 🏃',
    (c) => `Stan idealny. Przy okazji: to już ~${c.kcal} kcal z samego alkoholu — jakby Cię kusiły frytki, to licz dalej sam. 😄`,
    () => 'Kontrola to nie nuda. Kontrola to Ty decydujesz, jak kończy się ta historia.',
    () => 'W tej strefie wszystkie anegdoty są jeszcze śmieszne, a Ty jeszcze wiesz dlaczego.',
  ],
  good: [
    (c) => `${c.p}‰ — zabawa trwa na dobre. Jeszcze wszystko gra, ale to jest moment na wodę, nie na dolewkę.`,
    () => 'Dobra strefa, tylko krawędź coraz bliżej. Bohater tej historii wie, kiedy zwolnić. To Ty.',
    (c) => `Poziom rośnie. Następny drink przemyśl przy szklance wody — zero ${c.eta}, jakbyś planował.`,
    () => 'Humor jest, forma jeszcze jest. Utrzymaj ten stan godzinę, a wieczór przejdzie do historii tych dobrych.',
    () => 'Tu się waży cały wieczór: albo legenda o gościu, co umiał, albo historia na przeprosiny. Wybierasz Ty.',
    (c) => `${c.units} j. na liczniku. Ciało nadąża, ale już nadgania. Daj mu chwilę forów.`,
    () => 'Kac jutro nie będzie służył. Tak tylko przypominam, póki jeszcze negocjujesz z rozsądkiem. 🤝',
    () => 'Jeszcze pamiętasz, gdzie masz kurtkę. Utrzymajmy ten stan wiedzy do końca wieczoru. 🧥',
    (c) => `Solidny poziom (${c.p}‰). Dobra wiadomość: wszystko pod kontrolą. Lepsza: możesz to utrzymać.`,
    () => 'Woda teraz = brak żałowania jutro. Prosta matma, a mało kto ją liczy o tej porze.',
    () => 'Zabawa w pełni, a Ty wciąż za kierownicą tego wieczoru (metaforycznie — bo realnie już nie 😉).',
    () => 'Trzymaj to ostrożnie, jak pełną szklankę na parkiecie. Na razie — nic się nie wylało.',
  ],
  edge: [
    (c) => `${c.p}‰ — granica. Stąd jeszcze wraca się z klasą. Krok dalej i wieczór zaczyna pisać się sam.`,
    () => 'To ten moment, w którym „jeszcze jeden" brzmi najlepiej i kosztuje najwięcej. Przeczekaj go z wodą.',
    () => 'Serio: godzina przerwy teraz i kończysz wieczór jako zwycięzca. Licznik spada 0,15‰/h — zacznij już.',
    (c) => `Zero dopiero ${c.eta}. Wszystko, co dolejesz teraz, przesuwa to głębiej w noc — i w jutro.`,
    () => 'Jutrzejszy Ty ogląda tę scenę przez palce. Zrób mu przyjemność: woda, coś do jedzenia, wolniej.',
    () => 'Oby jutro nie było żałowania żadnej chwili. Masz to jeszcze w rękach — dosłownie, trzymasz szklankę. Niech będzie z wodą.',
    () => 'Granica to nie porażka. Granica to miejsce, w którym bohaterowie zawracają. 🦸',
    (c) => `${c.units} j. i licznik na krawędzi. Następne 30 minut zdecyduje, jaką historię opowiesz w poniedziałek.`,
    () => 'Telefon ma tryb samolotowy na takie chwile. Wiadomości do byłych też by go doceniły. ✈️',
    () => 'Forma leci, refleks leci — sprawdź się w gierce, zanim uznasz, że „czujesz się świetnie".',
    () => 'Balans jest jeszcze po Twojej stronie. Ale to ostatni przystanek, z którego autobus wraca za darmo.',
    () => 'Kac nie przychodzi od jednej dolewki. Przychodzi od tej JEDNEJ dolewki za dużo. Zwykle właśnie tej.',
  ],
  high: [
    (c) => `${c.p}‰ — strefa gadania głupot oficjalnie otwarta. 🗣️ Ty jej nie zauważysz, wszyscy inni tak.`,
    () => 'Każdy pomysł, który teraz masz, wyda się genialny. Zapisz go. Rano ocenisz. Nie wykonuj.',
    () => 'Ryzyko wkurzenia kogoś rośnie wykładniczo. Więcej słuchaj, mniej nadawaj — przetrwasz z honorem.',
    (c) => `Hamuj, kapitanie. Zero dopiero ${c.eta}, a Ty dopisujesz do rachunku. Woda. Jedzenie. Krzesło.`,
    () => 'To już nie zabawa idzie w górę, tylko licznik. Zabawa została dwa drinki temu.',
    () => 'Jutro będzie bolało — pytanie tylko: głowa czy duma? Jeszcze możesz wybrać żadne.',
    () => 'Nikt nigdy nie żałował, że w tym momencie przeszedł na wodę. Dosłownie nikt, sprawdzone. 💧',
    () => 'Twoje „jestem trzeźwy" właśnie przestało być wiarygodne dla każdego w promieniu 3 metrów.',
    (c) => `${c.units} j. — organizm gra na pół gwizdka. Sprawdź refleks w gierce, dane nie kłamią, w przeciwieństwie do samopoczucia.`,
    () => 'Duża prośba od jutrzejszego Ciebie: taxi zamiast dyskusji, woda zamiast dolewki, sen zamiast „after".',
    () => 'Historia zna zero przypadków, kiedy po tym poziomie zrobiło się mądrzej. Weselej pozornie. Głośniej na pewno.',
    () => 'Przypominajka: kac jutro nie będzie służył. A to, co teraz dolejesz, to kac z odsetkami.',
  ],
  critical: [
    () => 'STOP. Serio. Woda, coś do jedzenia i kierunek dom. Wszystko inne to już nie są Twoje decyzje, tylko alkoholu.',
    (c) => `${c.p}‰. Impreza się skończyła, nawet jeśli muzyka jeszcze gra. Zadbaj o siebie — to jedyny quest na teraz.`,
    () => 'Nic dobrego nie wydarzy się po tej granicy. Za to jutro możesz uratować już dziś: woda i odwrót.',
    (c) => `Zero dopiero ${c.eta}. Sen to jedyny kierunek, w którym warto teraz iść.`,
    () => 'Napisz komuś zaufanemu, gdzie jesteś. Bohaterowie wiedzą, kiedy poprosić o wsparcie. 🤝',
    () => 'Telefon: taxi. Ręka: woda. Głowa: poduszka. W tej kolejności, nic więcej.',
    () => 'To nie jest moment na oceny. To jest moment na plan powrotu. Reszta — jutro.',
    () => 'Jedzenie, woda, dom. Trzy słowa, jeden quest, wielki szacunek jak go domkniesz.',
  ],
}

export const OVERLAY_SPIKE: Line[] = [
  () => '🔥 To, co właśnie wpadło, dopiero wjeżdża. Mocny alkohol wchodzi szybciej, niż go czujesz — za ~15 min może być zupełnie inna rozmowa. 💀 Nic już nie zamawiaj.',
  () => '⚠️ Shot to pożyczka chwilówka: przyjemność teraz, odsetki za kwadrans. Przeczekaj z wodą, zanim ocenisz „czy czujesz".',
  () => '🚨 Świeża dostawa mocnego w krótkim czasie. Poziom zaraz skoczy — usiądź, wypij wodę i daj temu wylądować.',
  () => 'Mocny alkohol nie pyta o zgodę — wjeżdża bez kolejki. Następne 20 minut graj zachowawczo. 🛑',
]

export const OVERLAY_NO_FOOD: Line[] = [
  () => '🍽️ Pusty żołądek to turbo dla promili — wszystko wchodzi szybciej i mocniej. Zamów coś porządnego, nie chipsy.',
  () => 'Kiedy ostatnio jadłeś? Jedzenie to najtańszy hamulec bezpieczeństwa tego wieczoru. 🍔',
  () => 'Alkohol na czczo = winda ekspresowa w górę. Coś ciepłego na talerzu potrafi uratować całą noc.',
  () => 'Pro tip od fizjologii: posiłek spowalnia wchłanianie nawet o połowę. Kuchnia jeszcze otwarta? 🍕',
]

export const OVERLAY_RECALL_FAIL: Line[] = [
  (c) => `Pamięć krótka już szwankuje (quiz poległ). Przy ${c.p}‰ zaczynasz opowiadać tę samą historię drugi raz — publiczność to widzi. 😅`,
  () => 'Słowa z check-inu uciekły. To pierwszy sygnał, że jutro z tej nocy zostaną Ci fragmenty. Zwolnij, jeśli chcesz pamiętać puentę.',
  () => 'Quiz pamięci: porażka. Dobra wiadomość — jeszcze pamiętasz, że był quiz. Utrzymajmy chociaż to. 🧠',
]
