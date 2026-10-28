export interface Point {
  t: number
  v: number
}

/** Round a raw step up to 1, 2, 2.5, 5 or 10 × a power of ten. */
export function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

export interface Scale {
  min: number
  max: number
  ticks: number[]
}

/** Y-axis domain with round tick values that always bracket the data. */
export function yScale(values: number[]): Scale {
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (lo === hi) {
    lo = Math.max(0, lo - 5)
    hi = hi + 5
  }
  const step = niceStep((hi - lo) / 3)
  const min = Math.max(0, Math.floor(lo / step) * step)
  const max = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(v)
  return { min, max, ticks }
}

export const RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const
export type Range = (typeof RANGES)[number]
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365, All: Infinity }

/** Points inside the trailing window ending at `now`. */
export function filterRange<T extends { t: number }>(points: T[], range: Range, now: number): T[] {
  const days = RANGE_DAYS[range]
  return days === Infinity ? points : points.filter((p) => p.t >= now - days * 86_400_000)
}

/** Index of the entry in `xs` closest to `x` (xs sorted ascending). -1 when empty. */
export function nearestIndex(xs: number[], x: number): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i] - x)
    if (d < bestD) {
      best = i
      bestD = d
    }
  }
  return best
}

export type Metric = 'best' | 'heaviest' | 'volume'

export interface SeriesPoint extends Point {
  id: string
  /** Sets that session, e.g. "200×5 ×4 · 185×5". */
  sets: string
  /** This session beat every earlier one on the plotted metric. */
  pr: boolean
}

/** Flag points that set a new running high (the first point is a baseline). */
export function flagPRs<T extends { v: number }>(points: T[]): boolean[] {
  let run = -Infinity
  return points.map((p, i) => {
    const hit = i > 0 && p.v > run + 0.01
    run = Math.max(run, p.v)
    return hit
  })
}
