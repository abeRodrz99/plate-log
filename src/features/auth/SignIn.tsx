import { useState, type FormEvent } from 'react'
import { login, type SyncStatus } from '../../storage'

interface Props {
  status: SyncStatus
  onSignedIn(password: string): void
}

export function SignIn({ status, onSignedIn }: Props) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await login(password)
    if (err) {
      setError(err)
      setBusy(false)
    } else onSignedIn(password)
  }

  return (
    <div className="auth">
      <form className="auth-card card" onSubmit={submit}>
        <span className="logo big-logo" aria-hidden="true" />
        <h1>Plate Log</h1>
        <p className="muted">Enter your sync password to load your workouts on this device.</p>
        {!status.ready && (
          <p className="auth-err" role="alert">
            Sync isn’t fully set up on the server yet. Missing: {status.missing.join('; ')}.
          </p>
        )}
        {/* A hidden username lets iOS and password managers save the password. */}
        <input type="text" name="username" value="plate-log" autoComplete="username" readOnly hidden />
        <label className="lbl" htmlFor="auth-pw">
          Password
        </label>
        <input id="auth-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && (
          <p className="auth-err" role="alert">
            {error}
          </p>
        )}
        <button className="btn block" type="submit" disabled={busy || !password || !status.ready} style={{ marginTop: 18 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
