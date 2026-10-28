import { groupSets, exerciseVolume, bestOf } from '../../domain/math'
import type { HistoryEntry } from '../../domain/types'
import { flagPRs, type Metric, type SeriesPoint } from './chartMath'

export const METRIC_LABEL: Record<Metric, string> = { best: 'Best', heaviest: 'Heaviest', volume: 'Volume' }

const setsText = (h: HistoryEntry) =>
  groupSets(h.exercise.type, h.exercise.sets)
    .map((g) => (g.count > 1 ? `${g.text} ×${g.count}` : g.text))
    .join(' · ')

/** One point per session for the chosen metric. */
export function buildSeries(hist: HistoryEntry[], metric: Metric): SeriesPoint[] {
  const raw = hist.map((h) => {
    const sets = h.exercise.sets
    const v =
      metric === 'heaviest' ? sets.reduce((m, s) => Math.max(m, s.w ?? 0), 0) : metric === 'volume' ? exerciseVolume(h.exercise) : bestOf(h.exercise.type, sets)
    return { id: h.workout.id, t: h.workout.startedAt, v, sets: setsText(h) }
  })
  const flags = flagPRs(raw)
  return raw.map((p, i) => ({ ...p, pr: flags[i] }))
}
