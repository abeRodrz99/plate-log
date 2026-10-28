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
