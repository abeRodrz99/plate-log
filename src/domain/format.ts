/** Display unit. Values are stored as entered; this only changes labels. */
export const UNIT = 'lb'
/** Distance label for activities (labels only, like UNIT). */
export const DIST_UNIT = 'mi'

const pad2 = (x: number) => (x < 10 ? `0${x}` : `${x}`)

export function uid(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/** Parse a text field into a non-negative number, or null when empty/invalid. */
export function parseNum(v: string): number | null {
  if (v.trim() === '') return null
  const x = parseFloat(v)
  return Number.isFinite(x) && x >= 0 ? x : null
}

/** Trim to one decimal place; null becomes an empty string. */
export function fmtN(x: number | null | undefined): string {
  return x == null ? '' : String(Math.round(x * 10) / 10)
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${m}:${pad2(s % 60)}`
}

export function fmtDur(sec: number): string {
  const m = Math.round(sec / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad2(m % 60)}m` : `${Math.max(1, m)} min`
}

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export const fmtShort = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const fmtVol = (v: number) => `${Math.round(v).toLocaleString()} ${UNIT}`
