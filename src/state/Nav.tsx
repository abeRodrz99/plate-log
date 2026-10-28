import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

export const TABS = ['home', 'workout', 'progress', 'history'] as const
export type Tab = (typeof TABS)[number]

const parse = (): Tab => {
  const h = location.hash.replace('#', '')
  return (TABS as readonly string[]).includes(h) ? (h as Tab) : 'home'
}
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

interface NavContext {
  tab: Tab
  go(tab: Tab): void
  /** Workout id expanded on the History tab. */
  historyOpen: string | null
  setHistoryOpen(id: string | null): void
  /** Open a workout in History from anywhere. */
  showInHistory(id: string): void
}

const Ctx = createContext<NavContext | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const tab = useSyncExternalStore(subscribe, parse, () => 'home' as Tab)
  const [historyOpen, setHistoryOpen] = useState<string | null>(null)

  const go = useCallback((t: Tab) => {
    location.hash = t
  }, [])

  const showInHistory = useCallback(
    (id: string) => {
      setHistoryOpen(id)
      go('history')
      // After the tab swaps in, bring the opened card into view.
      window.setTimeout(() => document.querySelector('.hist.open')?.scrollIntoView({ block: 'start' }), 60)
    },
    [go],
  )

  const value = useMemo(
    () => ({ tab, go, historyOpen, setHistoryOpen, showInHistory }),
    [tab, go, historyOpen, showInHistory],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNav(): NavContext {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNav must be used inside <NavProvider>')
  return v
}
