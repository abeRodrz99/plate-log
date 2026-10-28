import { TabBar } from './components/TabBar'
import { History } from './features/history/History'
import { Progress } from './features/progress/Progress'
import { WorkoutTab } from './features/workout/WorkoutTab'
import { AppProvider, useApp } from './state/AppState'
import { NavProvider, useNav } from './state/Nav'

function Screen() {
  const { ready, toastMsg } = useApp()
  const { tab } = useNav()

  return (
    <>
      <div id="app">
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
        ) : (
          <WorkoutTab />
        )}
      </div>
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
        <Screen />
      </NavProvider>
    </AppProvider>
  )
}
