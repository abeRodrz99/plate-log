/**
 * Critically-damped-by-default spring that starts from the live value and
 * velocity, so a drag can hand off to an animation with no visible seam.
 * `response` is seconds; `damping` 1 = no overshoot, ~0.8 = a little bounce.
 */
export interface SpringOptions {
  response: number
  damping: number
}

export function springTo(
  from: number,
  to: number,
  velocity: number,
  { response, damping }: SpringOptions,
  onStep: (x: number, v: number) => void,
  onDone?: () => void,
): () => void {
  const k = (2 * Math.PI / response) ** 2
  const c = (4 * Math.PI * damping) / response
  let x = from
  let v = velocity
  let last = performance.now()
  let raf = 0

  const tick = (now: number) => {
    const dt = Math.min(0.032, Math.max(0, (now - last) / 1000))
    last = now
    const n = Math.max(1, Math.ceil(dt / 0.004))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      v += (-k * (x - to) - c * v) * h
      x += v * h
    }
    onStep(x, v)
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) {
      onStep(to, 0)
      onDone?.()
      return
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/** Where a flick at `velocity` px/s would come to rest (exponential decay). */
export const project = (velocity: number, decel = 0.998) => ((velocity / 1000) * decel) / (1 - decel)

/** Progressive resistance past an edge. */
export const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const buzz = (ms = 8) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}
