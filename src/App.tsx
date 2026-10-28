import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { Home } from './features/home/Home'
import { History } from './features/history/History'
import { Progress } from './features/progress/Progress'
import { WorkoutTab } from './features/workout/WorkoutTab'
import { SyncGate } from './features/auth/SyncGate'
import { AppProvider, useApp } from './state/AppState'
import type { Repository } from './storage'
import { ActivityUIProvider } from './state/ActivityUI'
import { NavProvider, useNav } from './state/Nav'

function Screen() {
  const { ready, toastMsg, loadError, reload } = useApp()
  const { tab } = useNav()

  return (
    <>
      <Sidebar />
      <main id="app" data-tab={tab}>
        {loadError ? (
          <div className="empty" style={{ marginTop: 40 }}>
            <b>Couldn’t load your data</b>
            {loadError}
            <div style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={reload}>
                Try again
              </button>
            </div>
          </div>
        ) : !ready ? (
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

function Shell({ repo, importFrom }: { repo: Repository; importFrom?: Repository }) {
  return (
    <AppProvider repo={repo} importFrom={importFrom}>
      <NavProvider>
        <ActivityUIProvider>
          <Screen />
        </ActivityUIProvider>
      </NavProvider>
    </AppProvider>
  )
}

export default function App() {
  return <SyncGate>{(repo, importFrom) => <Shell repo={repo} importFrom={importFrom} />}</SyncGate>
}
