import { createLocalRepository } from './localRepository'
import type { Repository } from './repository'

export type { Repository, Snapshot } from './repository'

/** The on-device repository (one shared instance). */
export const localRepository: Repository = createLocalRepository()

export { cloudConfigured, cloudClient } from './cloud'
export { createSupabaseRepository } from './supabaseRepository'

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
