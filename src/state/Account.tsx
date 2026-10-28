import { createContext, useContext } from 'react'

export interface Account {
  email: string | null
  signOut: (() => void) | null
}

export const AccountContext = createContext<Account>({ email: null, signOut: null })
export const useAccount = () => useContext(AccountContext)
