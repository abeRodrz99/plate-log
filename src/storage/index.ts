import { createLocalRepository } from './localRepository'
import type { Repository } from './repository'

export type { Repository, Snapshot } from './repository'

/** Pick the data backend. Swap this one line when a real database arrives. */
export function createRepository(): Repository {
  return createLocalRepository()
}

/* The in-progress workout is a per-device draft, written on every keystroke,
   so it stays in localStorage even after workouts move to a database. */
const DRAFT_KEY = 'platelog.active.v1'

export const draftStore = {
  load<T>(): T | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  save(value: unknown | null) {
    try {
      if (value) localStorage.setItem(DRAFT_KEY, JSON.stringify(value))
      else localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* storage blocked: the draft lives in memory only */
    }
  },
}
