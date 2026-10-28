import { describe, expect, it } from 'vitest'
import { countsByDay, heatWeeks, monthView, sessionsPerWeek, weekStart, weekStreak } from './consistency'
import type { Workout } from './types'

const w = (y: number, m: number, d: number): Workout => ({
  id: `${y}${m}${d}`,
  name: 'W',
  startedAt: new Date(y, m, d, 9).getTime(),
  notes: '',
  exercises: [],
})

// Wed 28 Oct 2026
const NOW = new Date(2026, 9, 28, 12)

describe('consistency', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart(NOW).getDate()).toBe(26)
    expect(weekStart(new Date(2026, 9, 25)).getDate()).toBe(19) // Sunday belongs to the previous Mon-Sun week
  })

  it('builds a Monday-first month grid and counts active/rest days', () => {
    const counts = countsByDay([w(2026, 9, 2), w(2026, 9, 2), w(2026, 9, 20), w(2026, 9, 27)])
    const v = monthView(2026, 9, counts, NOW)
    expect(v.cells.filter((c) => c === null)).toHaveLength(3) // Oct 1 2026 is a Thursday
    expect(v.activeDays).toBe(3)
    expect(v.restDays).toBe(28 - 3)
    expect(v.cells.find((c) => c?.day === 2)?.count).toBe(2)
    expect(v.cells.find((c) => c?.day === 28)?.today).toBe(true)
    expect(v.cells.find((c) => c?.day === 29)?.future).toBe(true)
  })

  it('counts consecutive active weeks and tolerates an empty current week', () => {
    const run = [w(2026, 9, 27), w(2026, 9, 20), w(2026, 9, 14)]
    expect(weekStreak(run, NOW)).toBe(3)
    expect(weekStreak(run.slice(1), NOW)).toBe(2) // current week (26-1 Nov) not yet logged, still counts the past two
    expect(weekStreak([w(2026, 9, 27), w(2026, 9, 6)], NOW)).toBe(1) // gap breaks it
    expect(weekStreak([], NOW)).toBe(0)
  })

  it('averages sessions per week', () => {
    const list = [w(2026, 9, 27), w(2026, 9, 20), w(2026, 9, 21), w(2026, 9, 14)]
    expect(sessionsPerWeek(list, NOW, 4)).toBe(1)
    expect(sessionsPerWeek(list, NOW, 8)).toBe(0.5)
  })

  it('lays out heat weeks ending on the current week', () => {
    const cols = heatWeeks(countsByDay([w(2026, 9, 28)]), NOW, 3)
    expect(cols).toHaveLength(3)
    expect(cols[2][2]).toMatchObject({ count: 1, future: false }) // Wednesday
    expect(cols[2][3].future).toBe(true)
  })
})

describe('consistency with other activities', () => {
  it('counts a day with only a run as active and keeps lifts separate', () => {
    const lifts = countsByDay([w(2026, 9, 26)])
    const acts = countsByDay([w(2026, 9, 27), w(2026, 9, 27)])
    const v = monthView(2026, 9, lifts, NOW, acts)
    expect(v.activeDays).toBe(2)
    expect(v.cells.find((c) => c?.day === 27)).toMatchObject({ count: 0, acts: 2 })
    expect(v.cells.find((c) => c?.day === 26)).toMatchObject({ count: 1, acts: 0 })
  })

  it('lets activities extend the week streak', () => {
    const lifts = [w(2026, 9, 27)]
    const runs = [w(2026, 9, 20), w(2026, 9, 14)] // lift-free weeks still count
    expect(weekStreak(lifts, NOW)).toBe(1)
    expect(weekStreak([...lifts, ...runs], NOW)).toBe(3)
  })
})
