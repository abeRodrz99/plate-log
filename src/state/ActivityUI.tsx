import { createContext, useContext, useState, type ReactNode } from 'react'
import { ActivitySheet } from '../components/ActivitySheet'

const Ctx = createContext<() => void>(() => {})

/** Lets any screen open the Log activity sheet. */
export function ActivityUIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Ctx.Provider value={() => setOpen(true)}>
      {children}
      {open && <ActivitySheet onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}

export const useLogActivity = () => useContext(Ctx)
