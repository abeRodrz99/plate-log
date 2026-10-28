import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { UNIT, fmtDate, fmtDur, fmtN, fmtShort, fmtVol } from '../../domain/format'
import { bestOf, e1rm, groupSets, historyFor, sessionPRs, workoutVolume } from '../../domain/math'
import { useApp } from '../../state/AppState'
import { useNav } from '../../state/Nav'
import { Chart } from './Chart'

export function Progress() {
  const { workouts, loadSample } = useApp()
  const { showInHistory } = useNav()
  const [picked, setPicked] = useState<string | null>(null)
  // undefined = default to the newest session; null = all collapsed
  const [openId, setOpenId] = useState<string | null | undefined>(undefined)

  const names = useMemo(() => {
    const counts = new Map<string, number>()
    for (const w of workouts) for (const e of w.exercises) counts.set(e.name, (counts.get(e.name) ?? 0) + 1)
    return [...counts.keys()].sort((a, b) => (counts.get(b) as number) - (counts.get(a) as number) || a.localeCompare(b))
  }, [workouts])

  if (!names.length) {
    return (
      <>
        <div className="top">
          <div>
            <h1>Progress</h1>
            <p className="sub">Strength trends per lift</p>
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

  const newest = [...workouts].sort((a, b) => b.startedAt - a.startedAt)[0]
  const name = picked && names.includes(picked) ? picked : newest.exercises[0].name
  const hist = historyFor(workouts, name)
  const type = hist[hist.length - 1].exercise.type
  const series = hist.map((h) => ({ t: h.workout.startedAt, v: bestOf(type, h.exercise.sets) }))
  const weighted = hist.some((h) => h.exercise.sets.some((s) => (s.w ?? 0) > 0))
  const prs = sessionPRs(hist, type)

  let heavy = 0
  let bestE = 0
  let bestSet = 0
  for (const h of hist)
    for (const s of h.exercise.sets) {
      heavy = Math.max(heavy, s.w ?? 0)
      bestE = Math.max(bestE, e1rm(s))
      if (type === 'wr' && (s.w ?? 0) > 0 && (s.r ?? 0) > 0) bestSet = Math.max(bestSet, (s.w as number) * (s.r as number))
    }

  const unitWord = type === 'time' ? 'seconds' : 'meters'
  const caption =
    type === 'wr'
      ? weighted
        ? `Best set each session, estimated 1RM (${UNIT})`
        : 'Best set each session, reps'
      : weighted
        ? `Heaviest set each session (${UNIT})`
        : `Longest set each session (${unitWord})`

  const topValue = Math.max(...series.map((p) => p.v))
  const stats: [string, string][] =
    type === 'wr' && weighted
      ? [
          [fmtN(heavy), `Heaviest ${UNIT}`],
          [String(Math.round(bestE)), 'Est. 1RM'],
          [Math.round(bestSet).toLocaleString(), 'Best set vol.'],
        ]
      : [
          [String(hist.length), 'Sessions'],
          [fmtN(topValue), weighted ? `Heaviest ${UNIT}` : `Best ${type === 'wr' ? 'reps' : unitWord}`],
          [fmtShort(hist[hist.length - 1].workout.startedAt), 'Last done'],
        ]

  const recent = [...hist].reverse().slice(0, 20)
  const expanded = openId === undefined ? recent[0].workout.id : openId

  return (
    <>
      <div className="top">
        <div>
          <h1>Progress</h1>
          <p className="sub">
            {hist.length} {hist.length === 1 ? 'session' : 'sessions'} of this lift
          </p>
        </div>
      </div>

      <select
        aria-label="Exercise"
        value={name}
        onChange={(e) => {
          setPicked(e.target.value)
          setOpenId(undefined)
        }}
      >
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <div className="stats">
        {stats.map(([value, label]) => (
          <div className="stat card" key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="chart card">
        <p className="cap">{caption}</p>
        <Chart points={series} />
        {series.length < 2 && <p className="cap">Log this lift again to see a trend.</p>}
      </div>

      <div className="sect">
        <h2>Recent sessions</h2>
      </div>
      <div className="rows">
        {recent.map(({ workout: w, exercise }) => {
          const open = expanded === w.id
          const v = workoutVolume(w)
          return (
            <div className={`sessw${open ? ' open' : ''}`} key={w.id}>
              <button className="sess" aria-expanded={open} onClick={() => setOpenId(open ? null : w.id)}>
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
                {prs.has(w.id) ? <span className="chip pr">PR</span> : <span />}
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
    </>
  )
}
