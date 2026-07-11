import { BarChart3, Beer, type LucideIcon } from 'lucide-react'

export type Tab = 'drink' | 'stats'

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'drink', label: 'Sesja', Icon: Beer },
  { id: 'stats', label: 'Staty', Icon: BarChart3 },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-card/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md grid grid-cols-2 px-2 py-1.5">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex flex-col items-center gap-1 py-2 rounded-2xl text-[11px] font-medium transition-colors ${
                active ? 'text-mint' : 'text-muted'
              }`}
            >
              <span
                className={`absolute inset-x-8 inset-y-0 rounded-2xl transition-opacity ${
                  active ? 'bg-mint/10 opacity-100' : 'opacity-0'
                }`}
              />
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} className="relative" />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
