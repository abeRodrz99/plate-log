import { describe, expect, it } from 'vitest'
import { bestOf, computePRs, e1rm, fmtSet, groupSets, historyFor, sessionPRs, workoutVolume } from './math'
import type { SetEntry, Workout } from './types'

const set = (w: number | null, r: number | null): SetEntry => ({ w, r, done: true })

function workout(id: string, startedAt: number, name: string, sets: SetEntry[], type: 'wr' | 'dist' = 'wr'): Workout {
  return { id, name: 'W', startedAt, notes: '', exercises: [{ id: `e${id}`, name, type, sets }] }
}

describe('e1rm', () => {
  it('uses Epley and treats a single as the load', () => {
    expect(e1rm(set(200, 1))).toBe(200)
    expect(e1rm(set(200, 5))).toBeCloseTo(233.33, 2)
  })
  it('is zero without load or reps', () => {
    expect(e1rm(set(null, 5))).toBe(0)
    expect(e1rm(set(100, null))).toBe(0)
  })
})

describe('scoring', () => {
  it('ranks bodyweight work by reps and loaded carries by load', () => {
    expect(bestOf('wr', [set(null, 4), set(null, 6)])).toBe(6)
    expect(bestOf('dist', [set(50, 40), set(75, 40)])).toBe(75)
  })
})

describe('formatting', () => {
  it('formats sets by type', () => {
    expect(fmtSet('wr', set(185, 5))).toBe('185×5')
    expect(fmtSet('wr', set(null, 6))).toBe('BW×6')
    expect(fmtSet('dist', set(50, 40))).toBe('50 lb · 40m')
  })
  it('groups consecutive identical sets', () => {
    const g = groupSets('wr', [set(195, 5), set(195, 5), set(195, 5), set(195, 4)])
    expect(g).toEqual([
      { text: '195×5', count: 3 },
      { text: '195×4', count: 1 },
    ])
  })
})

describe('volume', () => {
  it('sums load × reps for weighted lifts only', () => {
    const w = workout('1', 1, 'Back squat', [set(100, 5), set(100, 5), set(null, 10)])
    expect(workoutVolume(w)).toBe(1000)
  })
})

describe('personal records', () => {
  const a = workout('a', 1, 'Back squat', [set(185, 5)])
  const b = workout('b', 2, 'Back squat', [set(195, 5)])

  it('treats the first session as a baseline', () => {
    expect(computePRs([], a)).toEqual([])
  })
  it('flags a heavier session', () => {
    expect(computePRs([a], b)).toEqual(['Back squat · 228 lb est. 1RM'])
  })
  it('does not flag a lighter session', () => {
    expect(computePRs([b], a)).toEqual([])
  })
  it('marks which sessions beat everything before them', () => {
    const c = workout('c', 3, 'Back squat', [set(165, 5)])
    const prs = sessionPRs(historyFor([c, b, a], 'Back squat'), 'wr')
    expect([...prs]).toEqual(['b'])
  })
})
