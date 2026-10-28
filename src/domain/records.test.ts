import { describe, expect, it } from 'vitest'
import { exerciseRecords, isRecentPR, recentPRs } from './records'
import type { LoggedExercise, Workout } from './types'

const ex = (name: string, sets: [number, number][], type: LoggedExercise['type'] = 'wr'): LoggedExercise =>
  ({ id: name, name, type, sets: sets.map(([w, r]) => ({ w, r, done: true })) }) as LoggedExercise
const wk = (id: string, day: number, ...exercises: LoggedExercise[]): Workout => ({
  id,
  name: id,
  startedAt: new Date(2026, 9, day, 9).getTime(),
  notes: '',
  exercises,
})

const data = [
  wk('a', 1, ex('Squat', [[200, 5], [200, 5]]), ex('Nordic', [[0, 4]])),
  wk('b', 8, ex('Squat', [[210, 5], [225, 3]]), ex('Nordic', [[0, 5]])),
  wk('c', 15, ex('Squat', [[205, 5]])), // no PR
  wk('d', 22, ex('Squat', [[230, 5], [245, 1]])),
]

describe('exerciseRecords', () => {
  const squat = exerciseRecords(data).find((r) => r.name === 'Squat')!

  it('finds the heaviest, best e1RM and best-volume set', () => {
    expect(squat.heaviest).toMatchObject({ value: 245 })
    expect(squat.best.set).toMatchObject({ w: 230, r: 5 }) // 230 x 5 = 268 e1RM beats 245 x 1
    expect(squat.bestVolumeSet).toMatchObject({ value: 1150 })
    expect(squat.sessions).toBe(4)
  })

  it('lists rep maxes by the heaviest load for at least N reps', () => {
    const m = Object.fromEntries(squat.repMaxes.map((x) => [x.reps, x.w]))
    expect(m).toEqual({ 1: 245, 3: 230, 5: 230 })
  })

  it('counts PR sessions and treats the first session as a baseline', () => {
    expect(squat.prCount).toBe(2) // b and d (a is the baseline, c is lower)
    expect(squat.lastPrAt).toBe(new Date(2026, 9, 22, 9).getTime())
  })

  it('ranks unloaded lifts by reps and skips weight records', () => {
    const nordic = exerciseRecords(data).find((r) => r.name === 'Nordic')!
    expect(nordic.weighted).toBe(false)
    expect(nordic.best.value).toBe(5)
    expect(nordic.heaviest).toBeNull()
    expect(nordic.repMaxes).toEqual([])
    expect(nordic.headline).toBe('5 reps')
  })

  it('orders lifts by last done and flags recent PRs', () => {
    const list = exerciseRecords(data)
    expect(list[0].name).toBe('Squat')
    const now = new Date(2026, 9, 28).getTime()
    expect(isRecentPR(squat, now)).toBe(true)
    expect(isRecentPR(squat, new Date(2026, 11, 28).getTime())).toBe(false)
  })
})

describe('recentPRs', () => {
  it('returns PR events newest first and respects the limit', () => {
    const e = recentPRs(data, 3)
    expect(e.map((x) => `${x.name}@${x.workoutId}`)).toEqual(['Squat@d', 'Nordic@b', 'Squat@b'])
    expect(recentPRs(data, 1)).toHaveLength(1)
  })
})
