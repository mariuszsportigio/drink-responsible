import { Brain, FlaskConical, Info, Type, Waypoints, Zap, type LucideIcon } from 'lucide-react'
import { Modal } from './Modal'

const METHODS: { Icon: LucideIcon; name: string; what: string; pros: string; cons: string }[] = [
  {
    Icon: Zap,
    name: 'Refleks (światła)',
    what: 'Czerwone światło → czekasz, zielone → tapniesz jak najszybciej. 5 rund, liczy się średni czas reakcji; falstart dodaje karę.',
    pros: 'Czas reakcji prostej jest jednym z najczulszych wskaźników działania alkoholu i zmęczenia. Test trwa ~20 s.',
    cons: 'Efekt uczenia (pierwsze podejścia są wolniejsze), wynik zależy też od skupienia i tego, czy telefon leży czy jest w dłoni.',
  },
  {
    Icon: Waypoints,
    name: 'Percepcja (Trail Making)',
    what: 'Stukasz kółka na zmianę cyfra→litera (1→A→2→B…). Wynik = czas ukończenia + 1 s kary za pomyłkę.',
    pros: 'Trail Making Test to neuropsychologiczny klasyk (od 1944): skanowanie wzrokowe i podzielność uwagi siadają po alkoholu jako jedne z pierwszych — dokładnie to, co psuje ocenę sytuacji na mieście.',
    cons: 'Efekt uczenia układu przy częstym graniu (układ kółek jest losowy, ale strategia się wyrabia). Wynik zależy też od pośpiechu — graj zawsze „na maksa".',
  },
  {
    Icon: Brain,
    name: 'Pamięć robocza (Simon)',
    what: 'Powtarzasz rosnącą sekwencję podświetlanych pól. Wynik = najdłuższa zaliczona sekwencja (do 8).',
    pros: 'Pamięć robocza wyraźnie siada powyżej ~0,5‰ — dobrze różnicuje „lekko" od „konkretnie".',
    cons: 'Sufit wyniku (max 8) i efekt uczenia strategii zapamiętywania.',
  },
  {
    Icon: Type,
    name: 'Pamięć odroczona (słowa)',
    what: 'Na koniec check-inu dostajesz 3 słowa. Przy następnym (30–90 min później) wybierasz je z 9 chipów: 1 pkt za słowo na dobrym miejscu, 0,5 pkt za samo słowo w złej kolejności (max 3).',
    pros: 'Najbardziej „życiowy" test: sprawdza to samo, co pamiętanie rozmów sprzed godziny. Alkohol mocno uderza w konsolidację pamięci — zanim czujesz, że coś jest nie tak.',
    cons: 'Mało poziomów wyniku (0–3 co pół punktu), pojedynczy zły wynik może być przypadkiem. Patrz na trend, nie na jedną próbę.',
  },
  {
    Icon: FlaskConical,
    name: 'Promile (Widmark)',
    what: 'Szacunek: gramy czystego alkoholu ÷ (masa ciała × współczynnik 0,68 M / 0,55 K), minus spalanie 0,15‰/h liczone po osi czasu drinków.',
    pros: 'Standardowy model używany w toksykologii do szacunków. Dobrze pokazuje trend i rząd wielkości.',
    cons: 'Nie uwzględnia jedzenia, tempa wchłaniania, metabolizmu indywidualnego (±30% i więcej). To NIE jest alkomat.',
  },
]

export function MethodsInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Jak mierzymy formę" icon={<Info size={16} className="text-aqua" />} onClose={onClose}>
      <p className="text-sm text-muted mb-4">
        Każdy test porównujemy do Twojego <span className="text-white/80">baseline zmierzonego na trzeźwo</span> (mediana
        z 3 rund). Forma 100% = Twoja norma. Żaden wynik — nawet 110% — nie oznacza „możesz prowadzić" ani „możesz więcej".
      </p>
      <div className="flex flex-col gap-3">
        {METHODS.map((m) => (
          <div key={m.name} className="rounded-2xl bg-card2 border border-line p-4">
            <p className="flex items-center gap-2 font-bold text-sm mb-1.5">
              <m.Icon size={15} className="text-mint" /> {m.name}
            </p>
            <p className="text-xs text-white/75 leading-relaxed mb-2">{m.what}</p>
            <p className="text-xs leading-relaxed">
              <span className="text-mint font-bold">+ </span>
              <span className="text-muted">{m.pros}</span>
            </p>
            <p className="text-xs leading-relaxed mt-1">
              <span className="text-danger font-bold">− </span>
              <span className="text-muted">{m.cons}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted/80 mt-4 leading-relaxed">
        Wyniki gier i szacunki promili są orientacyjne — służą do obserwowania własnego trendu i hamowania w porę, nigdy
        do oceny zdolności prowadzenia pojazdów.
      </p>
    </Modal>
  )
}
