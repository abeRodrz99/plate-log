import type { ExerciseType, Template, Workout } from './types'

export const LIBRARY: ReadonlyArray<readonly [string, ExerciseType]> = [
  ['Back squat', 'wr'], ['Front squat', 'wr'], ['Goblet squat', 'wr'], ['Barbell RDL', 'wr'], ['Trap bar RDL', 'wr'],
  ['Deadlift', 'wr'], ['Single-leg RDL', 'wr'], ['Good morning', 'wr'], ['Barbell hip thrust', 'wr'], ['Single-leg hip thrust', 'wr'],
  ['Bulgarian split squat', 'wr'], ['Walking lunge', 'wr'], ['Reverse lunge', 'wr'], ['Lateral lunge', 'wr'], ['Cossack squat', 'wr'],
  ['High box step-up', 'wr'], ['Nordic curl', 'wr'], ['Slider leg curl', 'wr'], ['Leg curl (machine)', 'wr'], ['Leg extension', 'wr'],
  ['Standing calf raise (machine)', 'wr'], ['Seated calf raise (machine)', 'wr'], ['Single-leg calf raise', 'wr'], ['Tibialis raise', 'wr'],
  ['Loaded ankle rocks', 'wr'], ['Side plank with top-leg raise', 'wr'], ['Copenhagen plank', 'time'], ['Plank', 'time'],
  ['Suitcase carry', 'dist'], ['Farmer carry', 'dist'], ['Back extension', 'wr'],
  ['Bench press', 'wr'], ['Overhead press', 'wr'], ['Barbell row', 'wr'], ['Dumbbell row', 'wr'], ['Pull-up', 'wr'], ['Chin-up', 'wr'],
  ['Lat pulldown', 'wr'], ['Dip', 'wr'], ['Push-up', 'wr'], ['Incline dumbbell press', 'wr'], ['Face pull', 'wr'],
]

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, { tag: string; col: string }> = {
  wr: { tag: 'Weight × reps', col: 'Reps' },
  time: { tag: 'Timed', col: 'Sec' },
  dist: { tag: 'Distance', col: 'Meters' },
}

/** Name -> type for the built-in library plus anything already used in workouts or templates. */
export function exercisePool(workouts: Workout[], templates: Template[]): Map<string, ExerciseType> {
  const pool = new Map<string, ExerciseType>(LIBRARY)
  for (const w of workouts) for (const e of w.exercises) pool.set(e.name, e.type)
  for (const t of templates) for (const e of t.exercises) pool.set(e.name, e.type)
  return pool
}

export interface StarterTemplate {
  name: string
  exercises: ReadonlyArray<readonly [name: string, sets: number, reps: string]>
}

/** The two-day runner strength plan: hinge/hamstrings and squat/single-leg. */
export const STARTER_TEMPLATES: ReadonlyArray<StarterTemplate> = [
  {
    name: 'Day A · Hinge + Hamstrings',
    exercises: [
      ['Barbell RDL', 4, '5-6'], ['Bulgarian split squat', 3, '6-8'], ['Lateral lunge', 3, '6-8'], ['Nordic curl', 3, '5-6'],
      ['Standing calf raise (machine)', 4, '8-10'], ['Tibialis raise', 2, '15-20'], ['Suitcase carry', 3, '40'],
    ],
  },
  {
    name: 'Day B · Squat + Single-Leg',
    exercises: [
      ['Back squat', 4, '5'], ['High box step-up', 3, '8'], ['Barbell hip thrust', 3, '8'], ['Leg extension', 3, '12-15'],
      ['Seated calf raise (machine)', 3, '10-15'], ['Side plank with top-leg raise', 3, '8-10'], ['Loaded ankle rocks', 2, '10'],
    ],
  },
]
