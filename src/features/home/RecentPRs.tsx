import { useMemo } from 'react'
import { fmtShort } from '../../domain/format'
import { recentPRs } from '../../domain/records'
import type { Workout } from '../../domain/types'
import { useNav } from '../../state/Nav'

/** Latest personal records across all lifts; tap one to open that lift's trend. */
export function RecentPRs({ workouts, now }: { workouts: Workout[]; now: number }) {
  const { go, showLift } = useNav()
  const list = useMemo(() => recentPRs(workouts, 5), [workouts])
  const DAY = 86_400_000
  return (
    <section className="card pad" aria-label="Recent personal records">
      <div className="card-h">
        <h2>Recent PRs</h2>
        <button className="link" onClick={() => go('progress')}>
          All records
        </button>
      </div>
      {list.length ? (
        <ul className="prlist">
          {list.map((p) => (
            <li key={`${p.workoutId}|${p.name}`}>
              <button onClick={() => showLift(p.name)}>
                <span className="pn">
                  {p.name}
                  <small className="num">{p.label}</small>
                </span>
                <span className="chip pr">{now - p.t < 7 * DAY ? 'New' : fmtShort(p.t)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Beat your best on a lift and it lands here. A lift's first session is the baseline.</p>
      )}
    </section>
  )
}
