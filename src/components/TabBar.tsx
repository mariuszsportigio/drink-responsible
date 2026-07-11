export type Tab = 'drink' | 'stats'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'drink', label: 'Sesja', icon: '🍺' },
  { id: 'stats', label: 'Staty', icon: '📊' },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-card/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md grid grid-cols-2 px-2 py-1.5">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[11px] font-medium transition-colors ${
                active ? 'text-mint' : 'text-muted'
              }`}
            >
              <span
                className={`absolute inset-x-8 inset-y-0 rounded-2xl transition-opacity ${
                  active ? 'bg-mint/10 opacity-100' : 'opacity-0'
                }`}
              />
              <span className={`relative text-lg leading-none transition-transform ${active ? 'scale-110' : 'grayscale opacity-60'}`}>
                {t.icon}
              </span>
              <span className="relative">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
