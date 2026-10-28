import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccountContext } from '../../state/Account'
import { createRemoteRepository, detectSync, localRepository, sessionToken, type Repository, type SyncStatus } from '../../storage'
import { SignIn } from './SignIn'

interface Props {
  /** `importFrom` is the on-device repository, offered for upload on a first sign-in. */
  children(repo: Repository, importFrom?: Repository): ReactNode
}

/**
 * Decides where data lives. If the server has sync configured you sign in once per device and the
 * app runs against your account; otherwise (local dev, or sync not set up) it stays on-device.
 */
export function SyncGate({ children }: Props) {
  const [token, setToken] = useState(() => sessionToken.get())
  const [status, setStatus] = useState<SyncStatus | 'checking'>(token ? { available: true, ready: true, missing: [] } : 'checking')

  useEffect(() => {
    if (token) return
    let dead = false
    setStatus('checking')
    detectSync().then((s) => !dead && setStatus(s))
    return () => {
      dead = true
    }
  }, [token])

  const repo = useMemo(
    () =>
      token
        ? createRemoteRepository({
            getToken: () => sessionToken.get(),
            onUnauthorized: () => {
              sessionToken.clear()
              setToken(null)
            },
          })
        : null,
    [token],
  )

  if (token && repo) {
    const signOut = () => {
      sessionToken.clear()
      setToken(null)
    }
    return <AccountContext.Provider value={{ signOut }}>{children(repo, localRepository)}</AccountContext.Provider>
  }
  if (status === 'checking')
    return (
      <div className="auth">
        <p className="muted">Loading…</p>
      </div>
    )
  if (!status.available) return <>{children(localRepository)}</>
  return (
    <SignIn
      status={status}
      onSignedIn={(pw) => {
        sessionToken.set(pw)
        setToken(pw)
      }}
    />
  )
}
