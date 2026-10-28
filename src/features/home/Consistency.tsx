import { useMemo, useState } from 'react'
import { countsByDay, monthView, sessionsPerWeek, weekStreak } from '../../domain/consistency'
import type { Activity, Workout } from '../../domain/types'
import { Icon } from '../../components/Icon'
import { useLogActivity } from '../../state/ActivityUI'

const dayTitle = (key: string, lifts: number, acts: number) =>
  [key, lifts && `${lifts} lifting`, acts && `${acts} other`].filter(Boolean).join(' · ')

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function ConsistencyCalendar({ workouts, activities, now }: { workouts: Workout[]; activities: Activity[]; now: Date }) {
  const [offset, setOffset] = useState(0)
  const all = useMemo(() => [...workouts, ...activities], [workouts, activities])
  const counts = useMemo(() => countsByDay(workouts), [workouts])
  const actCounts = useMemo(() => countsByDay(activities), [activities])
  const logActivity = useLogActivity()
  const shown = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const view = monthView(shown.getFullYear(), shown.getMonth(), counts, now, actCounts)
  const label = shown.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <section className="card pad" aria-label="Consistency calendar">
      <div className="card-h">
        <h2>Consistency</h2>
        <div className="monthnav">
          <button className="icon round" aria-label="Previous month" onClick={() => setOffset(offset - 1)}>
            <span className="rot90"><Icon name="chev" size={16} /></span>
          </button>
          <span>{label}</span>
          <button className="icon round" aria-label="Next month" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
            <span className="rot-90"><Icon name="chev" size={16} /></span>
          </button>
        </div>
      </div>
      <div className="cal-wrap">
        <div className="cal" role="grid" aria-label={label}>
          {DOW.map((d, i) => (
            <span className="dow" key={i}>{d}</span>
          ))}
          {view.cells.map((c, i) =>
            c ? (
              <span
                key={c.key}
                className={`day${c.count ? ' on' : c.acts ? ' act' : ''}${c.count && c.acts ? ' both' : ''}${c.today ? ' today' : ''}${c.future ? ' future' : ''}`}
                title={dayTitle(c.key, c.count, c.acts)}
              >
                {c.day}
              </span>
            ) : (
              <span key={`p${i}`} />
            ),
          )}
        </div>
        <dl className="cal-stats">
          <div><dt>Active days</dt><dd className="num">{view.activeDays}</dd></div>
          <div><dt>Rest days</dt><dd className="num">{view.restDays}</dd></div>
          <div><dt>Week streak</dt><dd className="num">{weekStreak(all, now)}</dd></div>
          <div><dt>Per week</dt><dd className="num">{sessionsPerWeek(all, now)}</dd></div>
        </dl>
        <div className="cal-foot">
          <span className="legend"><i className="k kl" />Lifting <i className="k ka" />Other activity</span>
          <button className="btn ghost sm" onClick={logActivity}>+ Log activity</button>
        </div>
      </div>
    </section>
  )
}
