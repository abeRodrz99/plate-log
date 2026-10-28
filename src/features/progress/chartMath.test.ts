import { describe, expect, it } from 'vitest'
import { niceStep, yScale } from './chartMath'

describe('niceStep', () => {
  it('snaps to friendly steps', () => {
    expect(niceStep(13)).toBe(20)
    expect(niceStep(2.2)).toBe(2.5)
    expect(niceStep(0.9)).toBe(1)
    expect(niceStep(40)).toBe(50)
  })
})

describe('yScale', () => {
  it('brackets the data with round ticks', () => {
    const s = yScale([181, 233])
    expect(s.min).toBeLessThanOrEqual(181)
    expect(s.max).toBeGreaterThanOrEqual(233)
    expect(s.ticks[0]).toBe(s.min)
    expect(s.ticks[s.ticks.length - 1]).toBe(s.max)
  })
  it('handles a single value', () => {
    const s = yScale([100])
    expect(s.min).toBeLessThan(100)
    expect(s.max).toBeGreaterThan(100)
  })
  it('never goes below zero', () => {
    expect(yScale([0, 3]).min).toBe(0)
  })
})

import { filterRange, flagPRs, nearestIndex } from './chartMath'

describe('interactive chart helpers', () => {
  const DAY = 86_400_000
  const now = 100 * DAY

  it('filters to a trailing window and keeps everything for All', () => {
    const pts = [{ t: now - 200 * DAY }, { t: now - 40 * DAY }, { t: now - 3 * DAY }]
    expect(filterRange(pts, '1M', now)).toHaveLength(1)
    expect(filterRange(pts, '3M', now)).toHaveLength(2)
    expect(filterRange(pts, 'All', now)).toHaveLength(3)
  })

  it('finds the nearest point to a pointer position', () => {
    expect(nearestIndex([10, 50, 90], 12)).toBe(0)
    expect(nearestIndex([10, 50, 90], 71)).toBe(2)
    expect(nearestIndex([], 5)).toBe(-1)
  })

  it('flags new running highs after the baseline', () => {
    expect(flagPRs([{ v: 5 }, { v: 7 }, { v: 6 }, { v: 7 }, { v: 8 }])).toEqual([false, true, false, false, true])
  })
})
