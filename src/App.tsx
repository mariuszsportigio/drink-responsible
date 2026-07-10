import { useState } from 'react'
import { AppProvider } from './state/store'
import { TabBar, type Tab } from './components/TabBar'
import { CheckInManager } from './components/CheckInManager'
import { PushSync } from './components/PushSync'
import { DrinkScreen } from './screens/DrinkScreen'
import { TodayScreen } from './screens/TodayScreen'
import { HabitsScreen } from './screens/HabitsScreen'
import { StatsScreen } from './screens/StatsScreen'

export default function App() {
  const [tab, setTab] = useState<Tab>('drink')
  return (
    <AppProvider>
      <div className="mx-auto max-w-md min-h-dvh">
        {tab === 'today' && <TodayScreen />}
        {tab === 'habits' && <HabitsScreen />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'drink' && <DrinkScreen />}
        <TabBar tab={tab} onChange={setTab} />
        <CheckInManager />
        <PushSync />
      </div>
    </AppProvider>
  )
}
