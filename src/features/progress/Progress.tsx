import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { UNIT, fmtDate, fmtDur, fmtN, fmtShort, fmtVol } from '../../domain/format'
import { groupSets, historyFor, workoutVolume } from '../../domain/math'
import { exerciseRecords, isRecentPR, type ExerciseRecord } from '../../domain/records'
import { fmtSet } from '../../domain/math'
import { useApp } from '../../state/AppState'
import { useNav } from '../../state/Nav'
import { Chart } from './Chart'
import { RANGES, filterRange, type Metric, type Range } from './chartMath'
import { METRIC_LABEL, buildSeries } from './series'

type View = 'trend' | 'records'

const unitFor = (rec: ExerciseRecord, metric: Metric): string => {
  if (metric !== 'best') return UNIT
  if (rec.type === 'wr') return rec.weighted ? UNIT : 'reps'
  if (rec.type === 'time') return rec.weighted ? UNIT : 'seconds'
  return rec.weighted ? UNIT : 'meters'
}

const caption = (rec: ExerciseRecord, metric: Metric): string => {
  if (metric === 'heaviest') return `Heaviest set each session (${UNIT})`
  if (metric === 'volume') return `Total volume each session (${UNIT})`
  if (rec.type === 'wr') return rec.weighted ? `Best set each session, estimated 1RM (${UNIT})` : 'Best set each session, reps'
  return rec.weighted ? `Heaviest set each session (${UNIT})` : `Longest set each session (${rec.type === 'time' ? 'seconds' : 'meters'})`
}

export function Progress() {
  const { workouts, loadSample } = useApp()
  const { showInHistory, lift, setLift } = useNav()
  const [view, setView] = useState<View>('trend')
  const [q, setQ] = useState('')
  const [metric, setMetric] = useState<Metric>('best')
  const [range, setRange] = useState<Range>('All')
  // undefined = newest session open in the list; null = all collapsed; string = pinned on the chart and opened
  const [sel, setSel] = useState<string | null | undefined>(undefined)
  const now = useMemo(() => Date.now(), [])

  const records = useMemo(() => exerciseRecords(workouts), [workouts])

  if (!records.length) {
    return (
      <>
        <div className="top">
          <div>
            <h1>Progress</h1>
            <p className="sub">Records and trends per lift</p>
          </div>
        </div>
        <div className="empty">
          <b>Nothing to chart yet</b>Log a few sessions and each lift gets a trend line, personal records and a session list.
          <div style={{ marginTop: 12 }}>
            <button className="btn ghost sm" onClick={loadSample}>
              Load sample history
            </button>
          </div>
        </div>
      </>
    )
  }

  const rec = records.find((r) => r.name === lift) ?? records[0]
  const name = rec.name
  const hist = historyFor(workouts, name)
  const canMetric = rec.type === 'wr' && rec.weighted
  const m: Metric = canMetric ? metric : 'best'

  const full = buildSeries(hist, m)
  const series = filterRange(full, range, now)
  const prIds = new Set(full.filter((p) => p.pr).map((p) => p.id))

  const recent = [...hist].reverse().slice(0, 20)
  const expanded = sel === undefined ? recent[0].workout.id : sel

  const pick = (n: string) => {
    setLift(n)
    setSel(undefined)
    setMetric('best')
    setRange('All')
    setView('trend')
    window.scrollTo({ top: 0 })
  }

  const ql = q.trim().toLowerCase()
  const shown = ql ? records.filter((r) => r.name.toLowerCase().includes(ql)) : records

  const stats: { v: string; l: string; sub?: string }[] =
    canMetric && rec.heaviest
      ? [
          { v: fmtN(rec.heaviest.value), l: `Heaviest ${UNIT}`, sub: `${fmtSet('wr', rec.heaviest.set)} · ${fmtShort(rec.heaviest.t)}` },
          { v: String(Math.round(rec.best.value)), l: 'Est. 1RM', sub: `${fmtSet('wr', rec.best.set)} · ${fmtShort(rec.best.t)}` },
          ...(rec.bestVolumeSet ? [{ v: Math.round(rec.bestVolumeSet.value).toLocaleString(), l: 'Best set vol.', sub: fmtShort(rec.bestVolumeSet.t) }] : []),
        ]
      : [
          { v: String(rec.sessions), l: 'Sessions', sub: `since ${fmtShort(rec.firstAt)}` },
          { v: fmtN(rec.best.value), l: rec.weighted ? `Heaviest ${UNIT}` : `Best ${rec.type === 'wr' ? 'reps' : rec.type === 'time' ? 'seconds' : 'meters'}`, sub: fmtShort(rec.best.t) },
          { v: fmtShort(rec.lastAt), l: 'Last done' },
        ]

  return (
    <>
      <div className="top">
        <div>
          <h1>Progress</h1>
          <p className="sub">
            {records.length} {records.length === 1 ? 'lift' : 'lifts'} tracked · {records.reduce((a, r) => a + r.prCount, 0)} PRs
          </p>
        </div>
      </div>

      <div className="seg viewseg" role="group" aria-label="View">
        <button aria-pressed={view === 'trend'} onClick={() => setView('trend')}>
          Trend
        </button>
        <button aria-pressed={view === 'records'} onClick={() => setView('records')}>
          Records
        </button>
      </div>

      <div className="prog" data-view={view}>
        <aside className="prog-list card" aria-label="Lifts and personal records">
          <input type="search" placeholder="Search lifts" aria-label="Search lifts" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul>
            {shown.map((r) => (
              <li key={r.name}>
                <button className={`lift${r.name === name ? ' on' : ''}`} aria-current={r.name === name ? 'true' : undefined} onClick={() => pick(r.name)}>
                  <span className="lift-n">{r.name}</span>
                  <span className="lift-v num">{r.headline}</span>
                  {isRecentPR(r, now) && <span className="chip pr">PR</span>}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="muted lift-none">No lifts match “{q}”.</li>}
          </ul>
        </aside>

        <div className="prog-detail">
          <div className="detail-h">
            <div>
              <h2>{name}</h2>
              <p className="muted num">
                {rec.sessions} {rec.sessions === 1 ? 'session' : 'sessions'}
                {rec.best.value > 0 && ` · PR ${rec.headline} on ${fmtShort(rec.best.t)}`}
              </p>
            </div>
            <button className="link only-phone-block" onClick={() => setView('records')}>
              Change lift
            </button>
          </div>

          <div className="chart card">
            <div className="chart-bar">
              {canMetric && (
                <div className="seg sm" role="group" aria-label="Metric">
                  {(Object.keys(METRIC_LABEL) as Metric[]).map((k) => (
                    <button key={k} aria-pressed={m === k} onClick={() => setMetric(k)}>
                      {METRIC_LABEL[k]}
                    </button>
                  ))}
                </div>
              )}
              <div className="seg sm" role="group" aria-label="Range">
                {RANGES.map((r) => (
                  <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <p className="cap">{caption(rec, m)}</p>
            {series.length ? (
              <Chart
                points={series}
                unit={unitFor(rec, m)}
                animKey={`${name}|${m}|${range}`}
                selectedId={typeof sel === 'string' ? sel : null}
                onSelect={(id) => setSel(id)}
              />
            ) : (
              <p className="empty-chart">No sessions in this range.</p>
            )}
            {series.length === 1 && <p className="cap">Log this lift again to see a trend.</p>}
            <p className="cap hint">
              <span className="dotpr" /> New personal record · hover or tap the chart to inspect a session
            </p>
          </div>

          <div className="stats">
            {stats.map((s) => (
              <div className="stat card" key={s.l}>
                <b>{s.v}</b>
                <span>{s.l}</span>
                {s.sub && <small className="num">{s.sub}</small>}
              </div>
            ))}
          </div>

          {rec.repMaxes.length > 0 && (
            <div className="card pad repmax">
              <div className="card-h">
                <h2>Rep records</h2>
                <span className="muted small">Heaviest for at least N reps</span>
              </div>
              <div className="reps">
                {rec.repMaxes.map((r) => (
                  <div key={r.reps}>
                    <span>{r.reps}RM</span>
                    <b className="num">
                      {fmtN(r.w)} <small>{UNIT}</small>
                    </b>
                    <small className="num">{fmtShort(r.t)}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sect">
            <h2>Sessions</h2>
          </div>
          <div className="rows">
            {recent.map(({ workout: w, exercise }) => {
              const open = expanded === w.id
              const v = workoutVolume(w)
              return (
                <div className={`sessw${open ? ' open' : ''}`} key={w.id}>
                  <button className="sess" aria-expanded={open} onClick={() => setSel(open ? null : w.id)}>
                    <span className="d num">{fmtShort(w.startedAt)}</span>
                    <span className="num">
                      {groupSets(exercise.type, exercise.sets).map((g, i) => (
                        <span key={i}>
                          {i > 0 && ' · '}
                          {g.text}
                          {g.count > 1 && <span className="muted"> ×{g.count}</span>}
                        </span>
                      ))}
                    </span>
                    {prIds.has(w.id) ? <span className="chip pr">PR</span> : <span />}
                    <span className="chev">
                      <Icon name="chev" />
                    </span>
                  </button>
                  {open && (
                    <div className="sess-body">
                      <p className="sess-meta num">
                        {w.name} · {fmtDate(w.startedAt)} · {fmtDur(w.durationSec ?? 0)}
                        {v ? ` · ${fmtVol(v)}` : ''}
                      </p>
                      {w.exercises.map((e) => (
                        <div className={`hx${e.name === name ? ' cur' : ''}`} key={e.id}>
                          <h4>{e.name}</h4>
                          <ul>
                            {e.sets.map((s, i) => (
                              <li key={i}>
                                <span className="num">{i + 1}</span>
                                <span className="num">{groupSets(e.type, [s])[0].text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <div className="hist-actions">
                        <button className="btn ghost sm" onClick={() => showInHistory(w.id)}>
                          Open in History
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

