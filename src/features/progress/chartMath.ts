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
