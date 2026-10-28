import { useMemo } from 'react'
import { Icon } from '../../components/Icon'
import { TemplateCard } from '../../components/TemplateCard'
import { ThemeToggle } from '../../components/ThemeToggle'
import { STARTER_TEMPLATES } from '../../domain/library'
import { fmtDur, fmtShort, fmtVol } from '../../domain/format'
import { workoutVolume } from '../../domain/math'
import { useStart } from '../../lib/useStart'
import { useApp } from '../../state/AppState'
import { useNav } from '../../state/Nav'
import { ConsistencyCalendar, ThisWeek } from './Consistency'

const greeting = (h: number) => (h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')

export function Home() {
  const { workouts, templates, active, loadSample, addStarter } = useApp()
  const { go, showInHistory } = useNav()
  const start = useStart()
  const now = useMemo(() => new Date(), [])

  const recent = [...workouts].sort((a, b) => b.startedAt - a.startedAt).slice(0, 4)
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
            <button className="btn" onClick={() => start()}>
              <Icon name="plus" size={18} />
              {active ? 'Resume' : 'Start workout'}
            </button>
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
              {recent.map((w) => {
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
          <ThisWeek workouts={workouts} now={now} />
          <ConsistencyCalendar workouts={workouts} now={now} />
        </aside>
      </div>
    </>
  )
}
