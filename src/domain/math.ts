import { UNIT, fmtN } from './format'
import type { ExerciseType, HistoryEntry, LoggedExercise, SetEntry, Workout } from './types'

/** Epley estimated one-rep max. Zero when the set has no load or no reps. */
export function e1rm(s: SetEntry): number {
  const w = s.w ?? 0
  const r = s.r ?? 0
  if (w <= 0 || r <= 0) return 0
  return r === 1 ? w : w * (1 + r / 30)
}

/** The number a set is ranked by: e1RM for loaded lifts, else load, else reps. */
export function score(type: ExerciseType, s: SetEntry): number {
  const w = s.w ?? 0
  if (type === 'wr') return w > 0 ? e1rm(s) : (s.r ?? 0)
  return w > 0 ? w : (s.r ?? 0)
}

export function bestOf(type: ExerciseType, sets: SetEntry[]): number {
  return sets.reduce((best, s) => Math.max(best, score(type, s)), 0)
}

export function exerciseVolume(e: Pick<LoggedExercise, 'type' | 'sets'>): number {
  if (e.type !== 'wr') return 0
  return e.sets.reduce((a, s) => a + ((s.w ?? 0) > 0 && (s.r ?? 0) > 0 ? (s.w as number) * (s.r as number) : 0), 0)
}

export const workoutVolume = (w: Workout) => w.exercises.reduce((a, e) => a + exerciseVolume(e), 0)

export function fmtSet(type: ExerciseType, s: SetEntry): string {
  const w = (s.w ?? 0) > 0 ? fmtN(s.w) : ''
  if (type === 'wr') return `${w || 'BW'}×${s.r == null ? '?' : fmtN(s.r)}`
  return `${w ? `${w} ${UNIT} · ` : ''}${fmtN(s.r)}${type === 'time' ? 's' : 'm'}`
}

/** Collapse consecutive identical sets: 185×5, 185×5, 185×4 -> [{185×5, 2}, {185×4, 1}]. */
export function groupSets(type: ExerciseType, sets: SetEntry[]): { text: string; count: number }[] {
  const out: { text: string; count: number }[] = []
  for (const s of sets) {
    const text = fmtSet(type, s)
    const last = out[out.length - 1]
    if (last && last.text === text) last.count++
    else out.push({ text, count: 1 })
  }
  return out
}

/** Every logged instance of an exercise, oldest first. */
export function historyFor(workouts: Workout[], name: string): HistoryEntry[] {
  const out: HistoryEntry[] = []
  for (const workout of workouts)
    for (const exercise of workout.exercises) if (exercise.name === name) out.push({ workout, exercise })
  return out.sort((a, b) => a.workout.startedAt - b.workout.startedAt)
}

export function lastSets(workouts: Workout[], name: string): SetEntry[] {
  const h = historyFor(workouts, name)
  return h.length ? h[h.length - 1].exercise.sets : []
}

export function prLabel(type: ExerciseType, sets: SetEntry[], v: number): string {
  const weighted = sets.some((s) => (s.w ?? 0) > 0)
  if (type === 'wr') return weighted ? `${Math.round(v)} ${UNIT} est. 1RM` : `${Math.round(v)} reps`
  return weighted ? `${fmtN(v)} ${UNIT}` : `${fmtN(v)}${type === 'time' ? ' s' : ' m'}`
}

/**
 * Personal records in `w` compared with everything already in `prior`.
 * A first-ever session of a lift is a baseline, not a PR.
 */
export function computePRs(prior: Workout[], w: Workout): string[] {
  const out: string[] = []
  for (const e of w.exercises) {
    const before = historyFor(prior, e.name)
    if (!before.length) continue
    const priorBest = before.reduce((b, h) => Math.max(b, bestOf(e.type, h.exercise.sets)), 0)
    const best = bestOf(e.type, e.sets)
    if (best > 0 && best > priorBest + 0.01) out.push(`${e.name} · ${prLabel(e.type, e.sets, best)}`)
  }
  return out
}

/** Workout ids (oldest-first history) whose best set beat every earlier session. */
export function sessionPRs(history: HistoryEntry[], type: ExerciseType): Set<string> {
  const ids = new Set<string>()
  let run = 0
  history.forEach((h, i) => {
    const v = bestOf(type, h.exercise.sets)
    if (i > 0 && v > run + 0.01) ids.add(h.workout.id)
    run = Math.max(run, v)
  })
  return ids
}
