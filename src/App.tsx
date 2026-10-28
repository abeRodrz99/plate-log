import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { Home } from './features/home/Home'
import { History } from './features/history/History'
import { Progress } from './features/progress/Progress'
import { WorkoutTab } from './features/workout/WorkoutTab'
import { AuthGate } from './features/auth/AuthGate'
import { AppProvider, useApp } from './state/AppState'
import { cloudConfigured, localRepository, type Repository } from './storage'
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
  // With Supabase credentials in the build: sign in, then sync. Without: everything stays on this device.
  return cloudConfigured ? (
    <AuthGate>{(repo, local) => <Shell repo={repo} importFrom={local} />}</AuthGate>
  ) : (
    <Shell repo={localRepository} />
  )
}
