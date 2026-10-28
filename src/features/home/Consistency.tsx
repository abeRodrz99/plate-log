import { useMemo, useState } from 'react'
import { countsByDay, heatWeeks, monthView, sessionsPerWeek, weekStreak } from '../../domain/consistency'
import type { Workout } from '../../domain/types'
import { Icon } from '../../components/Icon'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function ThisWeek({ workouts, now }: { workouts: Workout[]; now: Date }) {
  const counts = useMemo(() => countsByDay(workouts), [workouts])
  const cols = useMemo(() => heatWeeks(counts, now, 12), [counts, now])
  const streak = weekStreak(workouts, now)
  const thisWeek = cols[cols.length - 1].reduce((a, d) => a + d.count, 0)
  return (
    <section className="card pad" aria-label="This week">
      <div className="card-h">
        <h2>This week</h2>
        <span className={`streak${streak ? ' on' : ''}`}>
          <Icon name="flame" size={16} />
          {streak} week streak
        </span>
      </div>
      <p className="big num">
        {thisWeek} <small>{thisWeek === 1 ? 'workout' : 'workouts'}</small>
      </p>
      <div className="heat" role="img" aria-label={`Workouts over the last 12 weeks, ${thisWeek} this week`}>
        {cols.map((col, i) => (
          <div className="heat-col" key={i}>
            {col.map((d) => (
              <i key={d.key} className={d.future ? 'f' : d.count > 1 ? 'l2' : d.count ? 'l1' : ''} title={d.key} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function ConsistencyCalendar({ workouts, now }: { workouts: Workout[]; now: Date }) {
  const [offset, setOffset] = useState(0)
  const counts = useMemo(() => countsByDay(workouts), [workouts])
  const shown = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const view = monthView(shown.getFullYear(), shown.getMonth(), counts, now)
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
                className={`day${c.count ? ' on' : ''}${c.today ? ' today' : ''}${c.future ? ' future' : ''}`}
                title={c.count ? `${c.key}: ${c.count} workout${c.count > 1 ? 's' : ''}` : c.key}
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
          <div><dt>Week streak</dt><dd className="num">{weekStreak(workouts, now)}</dd></div>
          <div><dt>Per week</dt><dd className="num">{sessionsPerWeek(workouts, now)}</dd></div>
        </dl>
      </div>
    </section>
  )
}
