/** How a set is measured: weight × reps, weight × seconds, or weight × meters. */
export type ExerciseType = 'wr' | 'time' | 'dist'

export interface SetEntry {
  /** Load in UNIT (null = bodyweight / not recorded). */
  w: number | null
  /** Reps, seconds or meters depending on the exercise type. */
  r: number | null
  done: boolean
}

export interface LoggedExercise {
  id: string
  name: string
  type: ExerciseType
  /** Target reps from the template, e.g. "6-8". Display only. */
  target?: string
  /** Target set count from the template. Display only. */
  tsets?: number
  sets: SetEntry[]
}

export interface Workout {
  id: string
  name: string
  startedAt: number
  endedAt?: number
  durationSec?: number
  notes: string
  /** Template this workout was started from, if any. */
  tid?: string | null
  exercises: LoggedExercise[]
  /** Personal records set in this workout, as display strings. */
  prs?: string[]
  /** True for generated demo data so it can be removed in one tap. */
  sample?: boolean
}

export interface TemplateExercise {
  name: string
  type: ExerciseType
  sets: number
  reps: string
}

export interface Template {
  id: string
  name: string
  updatedAt: number
  exercises: TemplateExercise[]
}

export interface HistoryEntry {
  workout: Workout
  exercise: LoggedExercise
}

/** Non-lifting activity. Logged only to feed the consistency views; it has no templates or sets. */
export const ACTIVITY_KINDS = ['Run', 'Cycle', 'Swim', 'Walk', 'Hike', 'Row', 'Yoga', 'Other'] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export interface Activity {
  id: string
  kind: ActivityKind
  startedAt: number
  durationMin: number | null
  /** In DIST_UNIT; stored as entered. */
  distance: number | null
  notes: string
  sample?: boolean
}
