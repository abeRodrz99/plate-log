const KEY = 'platelog.token'
const ENDPOINT = './api/sync'

/** The sync password, kept on this device after signing in. */
export const sessionToken = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(v: string) {
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* storage blocked: you'll be asked again next visit */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  },
}

export interface SyncStatus {
  /** The server has any sync configuration at all. */
  available: boolean
  /** Everything needed is configured. */
  ready: boolean
  missing: string[]
}

/** Ask the server whether sync is configured. Anything unexpected (dev server, offline) means on-device mode. */
export async function detectSync(fetchFn: typeof fetch = fetch): Promise<SyncStatus> {
  try {
    const res = await fetchFn(ENDPOINT, { cache: 'no-store' })
    const d = (await res.json()) as { sync?: boolean; ready?: boolean; missing?: string[] }
    if (!res.ok || d.sync !== true) return { available: false, ready: false, missing: [] }
    return { available: true, ready: d.ready === true, missing: d.missing ?? [] }
  } catch {
    return { available: false, ready: false, missing: [] }
  }
}

/** Check a password with the server. Returns an error message, or null when it was accepted. */
export async function login(password: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchFn(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
      body: JSON.stringify({ op: 'login' }),
    })
    if (res.ok) return null
    const d = (await res.json().catch(() => ({}))) as { error?: string }
    return d.error ?? `Sign-in failed (${res.status}).`
  } catch {
    return 'Can’t reach the server. Check your connection.'
  }
}
