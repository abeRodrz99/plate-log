import type { Activity, Template, Workout } from '../domain/types'

export interface Snapshot {
  workouts: Workout[]
  templates: Template[]
  activities: Activity[]
}

/**
 * The only seam between the UI and wherever data lives.
 * Today: browser storage. To go multi-device, implement this against an API or
 * hosted database and pick it in src/App.tsx.
 */
export interface Repository {
  /** 'device' = localStorage, 'memory' = storage blocked, 'remote' = your backend. */
  readonly kind: 'device' | 'memory' | 'remote'
  loadAll(): Promise<Snapshot>
  saveWorkout(w: Workout): Promise<void>
  deleteWorkout(id: string): Promise<void>
  saveTemplate(t: Template): Promise<void>
  deleteTemplate(id: string): Promise<void>
  saveActivity(a: Activity): Promise<void>
  deleteActivity(id: string): Promise<void>
}
