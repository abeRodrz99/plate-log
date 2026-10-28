import { uid } from './format'
import { computePRs } from './math'
import type { Activity, ExerciseType, Workout } from './types'

interface Spec {
  n: string
  t: ExerciseType
  s: number
  r: number
  /** Load at the first and last session; 0 means bodyweight. */
  w: [number, number]
  /** Optional rep ramp from first to last session. */
  rr?: [number, number]
}

const DAY_A: Spec[] = [
  { n: 'Barbell RDL', t: 'wr', s: 4, r: 6, w: [185, 225] },
  { n: 'Bulgarian split squat', t: 'wr', s: 3, r: 8, w: [30, 45] },
  { n: 'Lateral lunge', t: 'wr', s: 3, r: 8, w: [25, 35] },
  { n: 'Nordic curl', t: 'wr', s: 3, r: 4, rr: [4, 6], w: [0, 0] },
  { n: 'Standing calf raise (machine)', t: 'wr', s: 4, r: 10, w: [120, 170] },
  { n: 'Tibialis raise', t: 'wr', s: 2, r: 18, w: [0, 0] },
  { n: 'Suitcase carry', t: 'dist', s: 3, r: 40, w: [50, 75] },
]

const DAY_B: Spec[] = [
  { n: 'Back squat', t: 'wr', s: 4, r: 5, w: [155, 200] },
  { n: 'High box step-up', t: 'wr', s: 3, r: 8, w: [30, 50] },
  { n: 'Barbell hip thrust', t: 'wr', s: 3, r: 8, w: [155, 225] },
  { n: 'Leg extension', t: 'wr', s: 3, r: 12, w: [90, 120] },
  { n: 'Seated calf raise (machine)', t: 'wr', s: 3, r: 12, w: [70, 100] },
  { n: 'Side plank with top-leg raise', t: 'wr', s: 3, r: 10, w: [0, 0] },
  { n: 'Loaded ankle rocks', t: 'wr', s: 2, r: 10, w: [25, 40] },
]

const DAY_MS = 86_400_000
const WEEKS = 8
const DELOAD_WEEK = 4
const SKIPPED_A_WEEK = 3

function build(spec: Spec[], name: string, week: number, daysAgo: number, now: number): Workout {
  const k = week / (WEEKS - 1)
  const d = new Date(now - daysAgo * DAY_MS)
  d.setHours(17, 30, 0, 0)
  const startedAt = d.getTime()
  const durationSec = 3300 + ((week * 7) % 5) * 180
  return {
    id: uid('w_'),
    sample: true,
    name,
    startedAt,
    endedAt: startedAt + durationSec * 1000,
    durationSec,
    notes: '',
    tid: null,
    exercises: spec.map((x) => {
      let w = x.w[0] + (x.w[1] - x.w[0]) * k
      if (week === DELOAD_WEEK) w *= 0.9
      const step = w >= 100 ? 5 : 2.5
      const load = w > 0 ? Math.round(w / step) * step : null
      const reps = x.rr ? Math.round(x.rr[0] + (x.rr[1] - x.rr[0]) * k) : x.r
      return {
        id: uid('e_'),
        name: x.n,
        type: x.t,
        sets: Array.from({ length: x.s }, (_, i) => ({
          w: load,
          r: i === x.s - 1 && week % 2 === 0 && reps > 4 ? reps - 1 : reps,
          done: true,
        })),
      }
    }),
  }
}

/**
 * Eight weeks of the two runner-strength days with steady progression,
 * one skipped session and a deload week. PRs are computed in date order.
 */
export function buildSampleHistory(now: number = Date.now()): Workout[] {
  const out: Workout[] = []
  for (let week = 0; week < WEEKS; week++) {
    const base = 7 * (WEEKS - 1 - week)
    if (week !== SKIPPED_A_WEEK) out.push(build(DAY_A, 'Day A · Hinge + Hamstrings', week, base + 5, now))
    out.push(build(DAY_B, 'Day B · Squat + Single-Leg', week, base + 2, now))
  }
  out.sort((a, b) => a.startedAt - b.startedAt)
  const done: Workout[] = []
  for (const w of out) {
    w.prs = computePRs(done, w)
    done.push(w)
  }
  return out
}

/** Runs and rides around the sample lifting days (Tue easy run, Sat long run, alternate-Wed ride). */
export function buildSampleActivities(now = new Date()): Activity[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const out: Activity[] = []
  const add = (week: number, dayOffset: number, kind: Activity['kind'], durationMin: number, distance: number) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - week * 7 + dayOffset, 7, 30)
    if (d.getTime() > now.getTime()) return
    out.push({ id: uid('a_'), kind, startedAt: d.getTime(), durationMin, distance, notes: '', sample: true })
  }
  for (let wk = WEEKS - 1; wk >= 0; wk--) {
    const i = WEEKS - 1 - wk
    add(wk, 1, 'Run', 32 + i, 3.5)
    add(wk, 5, 'Run', 60 + i * 5, 6 + i * 0.5)
    if (wk % 2 === 0) add(wk, 2, 'Cycle', 45, 14)
  }
  return out
}
