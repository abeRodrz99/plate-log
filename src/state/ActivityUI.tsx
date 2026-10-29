import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { ActivitySheet } from '../components/ActivitySheet'

type Open = (date?: Date) => void
const Ctx = createContext<Open>(() => {})

/** Lets any screen open the Log activity sheet, optionally pre-set to a day. */
export function ActivityUIProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ date: Date } | null>(null)
  const open = useCallback<Open>((date) => setState({ date: date ?? new Date() }), [])
  return (
    <Ctx.Provider value={open}>
      {children}
      {state && <ActivitySheet initialDate={state.date} onClose={() => setState(null)} />}
    </Ctx.Provider>
  )
}

export const useLogActivity = () => useContext(Ctx)
