/** Anything that happened at a time: a lifting workout or a logged activity. */
type Dated = { startedAt: number }

const DAY = 86_400_000

/** Local calendar-day key, e.g. 2026-10-28. */
export function dayKey(t: number | Date): string {
  const d = typeof t === 'number' ? new Date(t) : t
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Monday 00:00 (local) of the week containing d. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** Number of workouts logged on each local day. */
export function countsByDay(workouts: Dated[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const w of workouts) m.set(dayKey(w.startedAt), (m.get(dayKey(w.startedAt)) ?? 0) + 1)
  return m
}

export interface CalCell {
  day: number
  key: string
  /** Lifting workouts that day. */
  count: number
  /** Other activities (run, ride, ...) that day. */
  acts: number
  today: boolean
  future: boolean
}

export interface MonthView {
  /** Monday-first grid; null = padding before the 1st. */
  cells: (CalCell | null)[]
  activeDays: number
  restDays: number
}

export function monthView(
  year: number,
  month: number,
  counts: Map<string, number>,
  now: Date,
  actCounts: Map<string, number> = new Map(),
): MonthView {
  const first = new Date(year, month, 1)
  const total = new Date(year, month + 1, 0).getDate()
  const todayKey = dayKey(now)
  const cells: (CalCell | null)[] = Array.from({ length: (first.getDay() + 6) % 7 }, () => null)
  let activeDays = 0
  let elapsed = 0
  for (let day = 1; day <= total; day++) {
    const d = new Date(year, month, day)
    const key = dayKey(d)
    const future = key > todayKey
    const count = counts.get(key) ?? 0
    const acts = actCounts.get(key) ?? 0
    if (!future) elapsed++
    if (count + acts > 0) activeDays++
    cells.push({ day, key, count, acts, today: key === todayKey, future })
  }
  return { cells, activeDays, restDays: elapsed - activeDays }
}

/** Consecutive weeks (Mon-Sun) with at least one workout. A current week with none yet doesn't break the streak. */
export function weekStreak(workouts: Dated[], now: Date): number {
  const weeks = new Set(workouts.map((w) => dayKey(weekStart(new Date(w.startedAt)))))
  let cursor = weekStart(now)
  if (!weeks.has(dayKey(cursor))) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7)
  let n = 0
  while (weeks.has(dayKey(cursor))) {
    n++
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7)
  }
  return n
}

/** Average workouts per week over the trailing `weeks` complete-or-current weeks. */
export function sessionsPerWeek(workouts: Dated[], now: Date, weeks = 8): number {
  const start = weekStart(now).getTime() - (weeks - 1) * 7 * DAY
  const n = workouts.filter((w) => w.startedAt >= start && w.startedAt <= now.getTime() + DAY).length
  return Math.round((n / weeks) * 10) / 10
}

/** Heatmap columns (weeks, oldest first) of 7 day-cells each, ending with the current week. */
export function heatWeeks(counts: Map<string, number>, now: Date, weeks = 12) {
  const todayKey = dayKey(now)
  const start = weekStart(now)
  return Array.from({ length: weeks }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() - (weeks - 1 - wi) * 7 + di)
      const key = dayKey(d)
      return { key, count: counts.get(key) ?? 0, future: key > todayKey }
    }),
  )
}
