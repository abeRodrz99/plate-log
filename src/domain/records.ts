import { bestOf, historyFor, prLabel, score, sessionPRs } from './math'
import type { ExerciseType, SetEntry, Workout } from './types'

export interface Mark {
  value: number
  set: SetEntry
  t: number
  workoutId: string
}

export interface RepMax {
  reps: number
  w: number
  t: number
}

export interface ExerciseRecord {
  name: string
  type: ExerciseType
  sessions: number
  firstAt: number
  lastAt: number
  /** Any set with a load. Unloaded lifts rank by reps (or seconds / metres). */
  weighted: boolean
  best: Mark
  heaviest: Mark | null
  bestVolumeSet: Mark | null
  /** Heaviest load lifted for at least N reps, for the usual rep targets. */
  repMaxes: RepMax[]
  prCount: number
  lastPrAt: number | null
  /** e.g. "233 lb est. 1RM". */
  headline: string
}

export const REP_TARGETS = [1, 3, 5, 8, 10] as const
export const RECENT_PR_DAYS = 14

/** One record card per lift, in order of last done. Ties on a record go to the earliest session. */
export function exerciseRecords(workouts: Workout[]): ExerciseRecord[] {
  const names = new Set<string>()
  for (const w of workouts) for (const e of w.exercises) names.add(e.name)

  const out: ExerciseRecord[] = []
  for (const name of names) {
    const hist = historyFor(workouts, name)
    if (!hist.length) continue
    const type = hist[hist.length - 1].exercise.type
    let best: Mark | null = null
    let heaviest: Mark | null = null
    let bestVol: Mark | null = null
    let weighted = false
    const rep = new Map<number, RepMax>()

    for (const h of hist) {
      const t = h.workout.startedAt
      for (const s of h.exercise.sets) {
        const w = s.w ?? 0
        const r = s.r ?? 0
        if (w > 0) weighted = true
        const sc = score(type, s)
        if (sc > 0 && (!best || sc > best.value)) best = { value: sc, set: s, t, workoutId: h.workout.id }
        if (w > 0 && (!heaviest || w > heaviest.value)) heaviest = { value: w, set: s, t, workoutId: h.workout.id }
        if (type === 'wr' && w > 0 && r > 0 && (!bestVol || w * r > bestVol.value))
          bestVol = { value: w * r, set: s, t, workoutId: h.workout.id }
        if (type === 'wr' && w > 0)
          for (const n of REP_TARGETS) {
            const cur = rep.get(n)
            if (r >= n && (!cur || w > cur.w)) rep.set(n, { reps: n, w, t })
          }
      }
    }

    const prs = sessionPRs(hist, type)
    const lastPrAt = hist.reduce<number | null>((a, h) => (prs.has(h.workout.id) ? h.workout.startedAt : a), null)
    const fallback: Mark = { value: 0, set: { w: null, r: null, done: false }, t: hist[0].workout.startedAt, workoutId: hist[0].workout.id }
    const top = best ?? fallback
    out.push({
      name,
      type,
      sessions: hist.length,
      firstAt: hist[0].workout.startedAt,
      lastAt: hist[hist.length - 1].workout.startedAt,
      weighted,
      best: top,
      heaviest,
      bestVolumeSet: bestVol,
      repMaxes: REP_TARGETS.map((n) => rep.get(n)).filter((x): x is RepMax => !!x),
      prCount: prs.size,
      lastPrAt,
      headline: top.value > 0 ? prLabel(type, [top.set], top.value) : 'No record yet',
    })
  }
  return out.sort((a, b) => b.lastAt - a.lastAt || a.name.localeCompare(b.name))
}

export const isRecentPR = (r: ExerciseRecord, now: number) =>
  r.lastPrAt !== null && now - r.lastPrAt <= RECENT_PR_DAYS * 86_400_000

export interface PREvent {
  name: string
  t: number
  workoutId: string
  label: string
}

/** Every time a lift's best beat all earlier sessions, newest first. */
export function recentPRs(workouts: Workout[], limit = 6): PREvent[] {
  const names = new Set<string>()
  for (const w of workouts) for (const e of w.exercises) names.add(e.name)
  const events: PREvent[] = []
  for (const name of names) {
    const hist = historyFor(workouts, name)
    const type = hist[hist.length - 1].exercise.type
    const ids = sessionPRs(hist, type)
    for (const h of hist)
      if (ids.has(h.workout.id))
        events.push({ name, t: h.workout.startedAt, workoutId: h.workout.id, label: prLabel(type, h.exercise.sets, bestOf(type, h.exercise.sets)) })
  }
  return events.sort((a, b) => b.t - a.t || a.name.localeCompare(b.name)).slice(0, limit)
}
