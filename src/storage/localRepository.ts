import type { Snapshot, Repository } from './repository'

const KEY = 'platelog.v1'
const empty = (): Snapshot => ({ workouts: [], templates: [] })

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id)
  if (i < 0) list.push(item)
  else list[i] = item
}

/** localStorage-backed repository that falls back to memory when storage is blocked. */
export function createLocalRepository(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = safeStorage()): Repository {
  let usable = storage !== null
  let mem: Snapshot = empty()

  if (storage) {
    try {
      storage.setItem('platelog.probe', '1')
      storage.removeItem('platelog.probe')
    } catch {
      usable = false
    }
  }

  const read = (): Snapshot => {
    if (!usable || !storage) return mem
    try {
      const raw = storage.getItem(KEY)
      if (!raw) return empty()
      const d = JSON.parse(raw) as Partial<Snapshot>
      return { workouts: d.workouts ?? [], templates: d.templates ?? [] }
    } catch {
      return mem
    }
  }

  const write = (d: Snapshot) => {
    mem = d
    if (!usable || !storage) return
    try {
      storage.setItem(KEY, JSON.stringify(d))
    } catch {
      usable = false
    }
  }

  return {
    kind: usable ? 'device' : 'memory',
    async loadAll() {
      return read()
    },
    async saveWorkout(w) {
      const d = read()
      upsert(d.workouts, w)
      write(d)
    },
    async deleteWorkout(id) {
      const d = read()
      d.workouts = d.workouts.filter((x) => x.id !== id)
      write(d)
    },
    async saveTemplate(t) {
      const d = read()
      upsert(d.templates, t)
      write(d)
    },
    async deleteTemplate(id) {
      const d = read()
      d.templates = d.templates.filter((x) => x.id !== id)
      write(d)
    },
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
