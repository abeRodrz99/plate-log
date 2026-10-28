import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { Home } from './features/home/Home'
import { History } from './features/history/History'
import { Progress } from './features/progress/Progress'
import { WorkoutTab } from './features/workout/WorkoutTab'
import { AppProvider, useApp } from './state/AppState'
import { ActivityUIProvider } from './state/ActivityUI'
import { NavProvider, useNav } from './state/Nav'

function Screen() {
  const { ready, toastMsg } = useApp()
  const { tab } = useNav()

  return (
    <>
      <Sidebar />
      <main id="app" data-tab={tab}>
        {!ready ? (
          <>
            <div className="top">
              <h1>Plate Log</h1>
            </div>
            <p className="muted">Loading your log…</p>
          </>
        ) : tab === 'history' ? (
          <History />
        ) : tab === 'progress' ? (
          <Progress />
        ) : tab === 'workout' ? (
          <WorkoutTab />
        ) : (
          <Home />
        )}
      </main>
      <TabBar />
      {toastMsg && (
        <div id="toast" role="status">
          {toastMsg}
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <NavProvider>
        <ActivityUIProvider>
          <Screen />
        </ActivityUIProvider>
      </NavProvider>
    </AppProvider>
  )
}
