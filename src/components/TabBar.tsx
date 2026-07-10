export type Tab = 'today' | 'habits' | 'stats' | 'drink'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Dziś', icon: '🎯' },
  { id: 'habits', label: 'Nawyki', icon: '☑️' },
  { id: 'stats', label: 'Statystyki', icon: '📊' },
  { id: 'drink', label: 'Drink', icon: '🍺' },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-card/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md grid grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              tab === t.id ? 'text-mint' : 'text-muted'
            }`}
          >
            <span className={`text-lg leading-none ${tab === t.id ? '' : 'grayscale opacity-70'}`}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
