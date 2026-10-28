import { createContext, useContext } from 'react'

export interface Account {
  /** Present only while syncing; call it to sign out of this device. */
  signOut: (() => void) | null
}

export const AccountContext = createContext<Account>({ signOut: null })
export const useAccount = () => useContext(AccountContext)
