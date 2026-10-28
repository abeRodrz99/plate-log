import { useMemo } from 'react'
import { Icon } from '../../components/Icon'
import { TemplateCard } from '../../components/TemplateCard'
import { ThemeToggle } from '../../components/ThemeToggle'
import { STARTER_TEMPLATES } from '../../domain/library'
import { DIST_UNIT, fmtDur, fmtN, fmtShort, fmtVol } from '../../domain/format'
import { workoutVolume } from '../../domain/math'
import { useStart } from '../../lib/useStart'
import { useConfirm } from '../../lib/useConfirm'
import { useLogActivity } from '../../state/ActivityUI'
import { useApp } from '../../state/AppState'
import { useNav } from '../../state/Nav'
import { ConsistencyCalendar } from './Consistency'
import { RecentPRs } from './RecentPRs'

const greeting = (h: number) => (h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')

export function Home() {
  const { workouts, templates, activities, active, loadSample, addStarter, deleteActivity } = useApp()
  const logActivity = useLogActivity()
  const { armed, confirm } = useConfirm()
  const { go, showInHistory } = useNav()
  const start = useStart()
  const now = useMemo(() => new Date(), [])

  const recent = [
    ...workouts.map((w) => ({ t: w.startedAt, w, a: null })),
    ...activities.map((a) => ({ t: a.startedAt, a, w: null })),
  ]
    .sort((x, y) => y.t - x.t)
    .slice(0, 5)
  const cards = [...templates].sort((a, b) => a.name.localeCompare(b.name))
  const lastFor = (id: string) => workouts.filter((w) => w.tid === id).sort((a, b) => b.startedAt - a.startedAt)[0]

  return (
    <>
      <div className="top">
        <div>
          <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>{greeting(now.getHours())}</h1>
        </div>
        <span className="only-phone">
          <ThemeToggle />
        </span>
      </div>

      <div className="home">
        <div className="home-main">
          <section className="hero card pad">
            <div>
              <h2>{active ? 'Workout in progress' : 'Ready to train?'}</h2>
              <p className="muted">
                {active ? `${active.name} is waiting where you left it.` : 'Start empty, or pick a plan below.'}
              </p>
            </div>
            <div className="hero-acts">
              <button className="btn" onClick={() => start()}>
                <Icon name="plus" size={18} />
                {active ? 'Resume' : 'Start workout'}
              </button>
              <button className="btn ghost" onClick={logActivity}>
                Log run, ride…
              </button>
            </div>
          </section>

          <div className="sect">
            <h2>Your plans</h2>
            <button className="link" onClick={() => go('workout')}>See all</button>
          </div>
          {cards.length ? (
            <div className="hscroll">
              {cards.map((t) => (
                <TemplateCard key={t.id} t={t} last={lastFor(t.id)} onStart={() => start(t)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>No plans yet</b>Add a starter program, or build your own in the Workout tab.
              <div className="chips">
                {STARTER_TEMPLATES.map((s, i) => (
                  <button className="btn ghost sm" key={s.name} onClick={() => addStarter(i)}>
                    + {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sect">
            <h2>Recent</h2>
            <button className="link" onClick={() => go('history')}>History</button>
          </div>
          {recent.length ? (
            <div className="rows">
              {recent.map((r) => {
                if (r.a) {
                  const x = r.a
                  const bits = [fmtShort(x.startedAt), x.durationMin ? `${fmtN(x.durationMin)} min` : '', x.distance ? `${fmtN(x.distance)} ${DIST_UNIT}` : '']
                  return (
                    <div className="row" key={x.id}>
                      <div className="grow">
                        <h3>{x.kind}</h3>
                        <p className="num">{bits.filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="chip">Activity</span>
                      <button
                        className={`btn sm ${armed === x.id ? 'danger' : 'ghost'}`}
                        aria-label={`Delete ${x.kind}`}
                        onClick={() => confirm(x.id) && deleteActivity(x.id)}
                      >
                        {armed === x.id ? 'Tap again' : 'Delete'}
                      </button>
                    </div>
                  )
                }
                const w = r.w
                const v = workoutVolume(w)
                return (
                  <button className="row rowbtn" key={w.id} onClick={() => showInHistory(w.id)}>
                    <div className="grow">
                      <h3>{w.name}</h3>
                      <p className="num">
                        {fmtShort(w.startedAt)} · {fmtDur(w.durationSec ?? 0)}
                        {v ? ` · ${fmtVol(v)}` : ''}
                      </p>
                    </div>
                    {w.prs?.length ? <span className="chip pr">{w.prs.length} PR</span> : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="empty">
              <b>No workouts yet</b>Finish one and it lands here.
              <div style={{ marginTop: 12 }}>
                <button className="btn ghost sm" onClick={loadSample}>Load sample history</button>
              </div>
            </div>
          )}
        </div>

        <aside className="home-rail">
          <ConsistencyCalendar workouts={workouts} activities={activities} now={now} />
          <RecentPRs workouts={workouts} now={now.getTime()} />
        </aside>
      </div>
    </>
  )
}
