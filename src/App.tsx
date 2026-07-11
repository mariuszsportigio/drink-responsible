import { useState } from 'react'
import { AppProvider } from './state/store'
import { TabBar, type Tab } from './components/TabBar'
import { CheckInManager } from './components/CheckInManager'
import { PushSync } from './components/PushSync'
import { DrinkScreen } from './screens/DrinkScreen'
import { StatsScreen } from './screens/StatsScreen'

export default function App() {
  const [tab, setTab] = useState<Tab>('drink')
  return (
    <AppProvider>
      <div className="mx-auto max-w-md min-h-dvh pt-[env(safe-area-inset-top)]">
        <div key={tab} className="screen-in">
          {tab === 'drink' && <DrinkScreen />}
          {tab === 'stats' && <StatsScreen />}
        </div>
        <TabBar tab={tab} onChange={setTab} />
        <CheckInManager />
        <PushSync />
      </div>
    </AppProvider>
  )
}
