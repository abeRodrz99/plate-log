import type { SupabaseClient } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'

export function SignIn({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="auth">
      <form className="auth-card card" onSubmit={submit}>
        <span className="logo big-logo" aria-hidden="true" />
        <h1>Plate Log</h1>
        <p className="muted">Sign in to sync your workouts across devices.</p>
        <label className="lbl" htmlFor="auth-email">Email</label>
        <input id="auth-email" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="lbl" htmlFor="auth-pw">Password</label>
        <input id="auth-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="auth-err" role="alert">{error}</p>}
        <button className="btn block" type="submit" disabled={busy || !email || !password} style={{ marginTop: 18 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
