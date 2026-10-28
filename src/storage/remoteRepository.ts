import type { Activity, Template, Workout } from '../domain/types'
import type { Repository, Snapshot } from './repository'

type Kind = 'workouts' | 'templates' | 'activities'
interface Change {
  kind: Kind
  id: string
  item: { id: string } | null
}

export interface RemoteOptions {
  getToken(): string | null
  /** Called when the server rejects the password (e.g. it was changed). */
  onUnauthorized(): void
  endpoint?: string
  fetchFn?: typeof fetch
}

const CHUNK = 400 // stay under the server's per-request limit

/**
 * Repository that talks to the app's own /api/sync endpoint (Upstash Redis behind it).
 * Writes made in the same tick are batched into one request, so loading sample data
 * or uploading a device's history is a handful of requests rather than one per record.
 */
export function createRemoteRepository(opts: RemoteOptions): Repository {
  const endpoint = opts.endpoint ?? './api/sync'
  const doFetch = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a))

  const post = async <T>(body: unknown): Promise<T> => {
    let res: Response
    try {
      res = await doFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.getToken() ?? ''}` },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error('You appear to be offline.')
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.status === 401) {
      opts.onUnauthorized()
      throw new Error('Signed out. Sign in again.')
    }
    if (!res.ok) throw new Error(data.error ?? `Sync failed (${res.status}).`)
    return data as T
  }

  // Last write per record wins within a batch.
  let pending = new Map<string, { change: Change; settle: { resolve(): void; reject(e: unknown): void }[] }>()
  let scheduled = false

  const flush = async () => {
    scheduled = false
    const batch = pending
    pending = new Map()
    const entries = [...batch.values()]
    try {
      for (let i = 0; i < entries.length; i += CHUNK) await post({ op: 'write', changes: entries.slice(i, i + CHUNK).map((e) => e.change) })
      entries.forEach((e) => e.settle.forEach((s) => s.resolve()))
    } catch (err) {
      entries.forEach((e) => e.settle.forEach((s) => s.reject(err)))
    }
  }

  const write = (change: Change): Promise<void> =>
    new Promise((resolve, reject) => {
      const k = `${change.kind}:${change.id}`
      const prev = pending.get(k)
      pending.set(k, { change, settle: [...(prev?.settle ?? []), { resolve, reject }] })
      if (!scheduled) {
        scheduled = true
        setTimeout(flush, 0)
      }
    })

  return {
    kind: 'remote',
    async loadAll(): Promise<Snapshot> {
      const d = await post<{ workouts: Workout[]; templates: Template[]; activities: Activity[] }>({ op: 'load' })
      return { workouts: d.workouts ?? [], templates: d.templates ?? [], activities: d.activities ?? [] }
    },
    saveWorkout: (w) => write({ kind: 'workouts', id: w.id, item: w }),
    deleteWorkout: (id) => write({ kind: 'workouts', id, item: null }),
    saveTemplate: (t) => write({ kind: 'templates', id: t.id, item: t }),
    deleteTemplate: (id) => write({ kind: 'templates', id, item: null }),
    saveActivity: (a) => write({ kind: 'activities', id: a.id, item: a }),
    deleteActivity: (id) => write({ kind: 'activities', id, item: null }),
  }
}
