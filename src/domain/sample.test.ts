import { describe, expect, it } from 'vitest'
import { bestOf, historyFor } from './math'
import { buildSampleHistory } from './sample'

const NOW = new Date('2026-10-28T12:00:00').getTime()

describe('buildSampleHistory', () => {
  const list = buildSampleHistory(NOW)

  it('creates 15 flagged workouts: 8 Day B and 7 Day A (one skipped)', () => {
    expect(list).toHaveLength(15)
    expect(list.every((w) => w.sample)).toBe(true)
    expect(list.filter((w) => w.name.startsWith('Day A'))).toHaveLength(7)
    expect(list.filter((w) => w.name.startsWith('Day B'))).toHaveLength(8)
  })

  it('is ordered oldest to newest and ends within the last week', () => {
    for (let i = 1; i < list.length; i++) expect(list[i].startedAt).toBeGreaterThanOrEqual(list[i - 1].startedAt)
    expect(NOW - list[list.length - 1].startedAt).toBeLessThan(7 * 86_400_000)
  })

  it('progresses the squat with a dip in the deload week', () => {
    const squat = historyFor(list, 'Back squat').map((h) => bestOf(h.exercise.type, h.exercise.sets))
    expect(squat).toHaveLength(8)
    expect(squat[7]).toBeGreaterThan(squat[0])
    expect(squat[4]).toBeLessThan(squat[3])
  })

  it('records PRs only after a lift has history', () => {
    expect(list[0].prs).toEqual([])
    expect(list.some((w) => (w.prs?.length ?? 0) > 0)).toBe(true)
  })
})
