import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cloudClient, createSupabaseRepository, localRepository, type Repository } from '../../storage'
import { AccountContext } from '../../state/Account'
import { SignIn } from './SignIn'

type Auth = { status: 'loading' } | { status: 'error'; message: string } | { status: 'out'; client: SupabaseClient } | { status: 'in'; client: SupabaseClient; userId: string; email: string | null }

interface Props {
  children(repo: Repository, local: Repository): ReactNode
}

/** Shows the sign-in screen until there is a session, then renders the app against the account's repository. */
export function AuthGate({ children }: Props) {
  const [auth, setAuth] = useState<Auth>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let off: (() => void) | undefined
    let dead = false
    setAuth({ status: 'loading' })
    cloudClient()
      .then(async (client) => {
        const apply = (session: { user: { id: string; email?: string } } | null) => {
          if (dead) return
          setAuth(session ? { status: 'in', client, userId: session.user.id, email: session.user.email ?? null } : { status: 'out', client })
        }
        const { data } = await client.auth.getSession()
        apply(data.session)
        const sub = client.auth.onAuthStateChange((_e, session) => apply(session))
        off = () => sub.data.subscription.unsubscribe()
      })
      .catch((e: unknown) => !dead && setAuth({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the sign-in service.' }))
    return () => {
      dead = true
      off?.()
    }
  }, [attempt])

  const userId = auth.status === 'in' ? auth.userId : null
  const client = auth.status === 'in' ? auth.client : null
  const repo = useMemo(() => (client && userId ? createSupabaseRepository(client, userId) : null), [client, userId])

  if (auth.status === 'loading') return <div className="auth"><p className="muted">Loading…</p></div>
  if (auth.status === 'error')
    return (
      <div className="auth">
        <div className="auth-card card">
          <h1>Can’t connect</h1>
          <p className="muted">{auth.message}</p>
          <button className="btn block" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </div>
    )
  if (auth.status === 'out') return <SignIn client={auth.client} />

  return (
    <AccountContext.Provider value={{ email: auth.email, signOut: () => void auth.client.auth.signOut() }}>
      {repo && children(repo, localRepository)}
    </AccountContext.Provider>
  )
}
