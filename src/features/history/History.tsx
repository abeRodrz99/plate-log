import { Icon } from '../../components/Icon'
import { fmtDate, fmtDur, fmtShort, fmtVol } from '../../domain/format'
import { fmtSet, workoutVolume } from '../../domain/math'
import type { Workout } from '../../domain/types'
import { useConfirm } from '../../lib/useConfirm'
import { useWide } from '../../lib/useMedia'
import { useApp } from '../../state/AppState'
import { useNav } from '../../state/Nav'

const STORAGE_NOTE = {
  device: 'Saved in this browser only.',
  memory: 'Storage is blocked here, so data is lost when you close the page.',
  remote: 'Synced to your account.',
} as const

export function History() {
  const { workouts, storageKind, loadSample, removeSample } = useApp()
  const { historyOpen, setHistoryOpen } = useNav()
  const { armed, confirm } = useConfirm()
  const wide = useWide()
  const list = [...workouts].sort((a, b) => b.startedAt - a.startedAt)
  const hasSample = workouts.some((w) => w.sample)
  const selected = list.find((w) => w.id === historyOpen) ?? list[0]

  return (
    <>
      <div className="top">
        <div>
          <h1>History</h1>
          <p className="sub">
            {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'} logged
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <b>No workouts yet</b>Finish a workout and it shows up here, newest first.
          <div style={{ marginTop: 12 }}>
            <button className="btn ghost sm" onClick={loadSample}>
              Load sample history
            </button>
          </div>
        </div>
      ) : wide ? (
        <div className="hsplit">
          <div className="hlist card" role="list" aria-label="Workouts">
            {list.map((w) => {
              const v = workoutVolume(w)
              return (
                <button
                  key={w.id}
                  role="listitem"
                  className={`hitem${w.id === selected.id ? ' on' : ''}`}
                  aria-current={w.id === selected.id ? 'true' : undefined}
                  onClick={() => setHistoryOpen(w.id)}
                >
                  <span className="hi-d num">{fmtShort(w.startedAt)}</span>
                  <span className="hi-n">
                    <b>{w.name}</b>
                    <small className="num">
                      {fmtDur(w.durationSec ?? 0)}
                      {v ? ` · ${fmtVol(v)}` : ''}
                    </small>
                  </span>
                  {w.prs?.length ? <span className="chip pr">{w.prs.length} PR</span> : null}
                </button>
              )
            })}
          </div>
          <article className="hdetail card" key={selected.id}>
            <WorkoutDetail w={selected} wide />
          </article>
        </div>
      ) : (
        list.map((w) => <HistoryCard key={w.id} w={w} />)
      )}

      <div className="foot">
        <span>{STORAGE_NOTE[storageKind]}</span>
        {hasSample ? (
          <button
            className={`btn sm ${armed === 'rm-sample' ? 'danger' : 'ghost'}`}
            onClick={() => confirm('rm-sample') && removeSample()}
          >
            {armed === 'rm-sample' ? 'Tap again to remove' : 'Remove sample data'}
          </button>
        ) : (
          list.length > 0 && (
            <button className="btn ghost sm" onClick={loadSample}>
              Load sample history
            </button>
          )
        )}
      </div>
    </>
  )
}

/** Exercises, notes and actions for one workout, shared by the phone card and the desktop detail pane. */
function WorkoutDetail({ w, wide = false }: { w: Workout; wide?: boolean }) {
  const { setHistoryOpen, go } = useNav()
  const { deleteWorkout, templateFromWorkout, startWorkout, active, toast } = useApp()
  const { armed, confirm } = useConfirm()
  const v = workoutVolume(w)

  const again = () => {
    if (active) {
      toast('Finish or discard your current workout first.')
      return
    }
    startWorkout({
      id: null,
      name: w.name,
      exercises: w.exercises.map((e) => ({ name: e.name, type: e.type, sets: e.sets.length, reps: '' })),
    })
    go('workout')
  }

  return (
    <>
      {wide && (
        <header className="hd-h">
          <h2>{w.name}</h2>
          <p className="muted num">
            {fmtDate(w.startedAt)} · {fmtDur(w.durationSec ?? 0)}
            {v ? ` · ${fmtVol(v)}` : ''}
            {w.sample ? ' · Sample' : ''}
          </p>
          {w.prs && w.prs.length > 0 && (
            <div className="hist-prs flush">
              {w.prs.map((p) => (
                <span className="chip pr" key={p}>
                  PR · {p}
                </span>
              ))}
            </div>
          )}
        </header>
      )}
      <div className={wide ? 'hgrid' : undefined}>
        {w.exercises.map((e) => (
          <div className="hx" key={e.id}>
            <h4>{e.name}</h4>
            <ul>
              {e.sets.map((s, i) => (
                <li key={i}>
                  <span className="num">{i + 1}</span>
                  <span className="num">{fmtSet(e.type, s)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {w.notes && (
        <p className="muted" style={{ marginTop: 8 }}>
          {w.notes}
        </p>
      )}
      <div className="hist-actions">
        <button className="btn sm" onClick={again}>
          Do again
        </button>
        <button className="btn ghost sm" onClick={() => templateFromWorkout(w)}>
          Save as template
        </button>
        <button
          className={`btn sm ${armed === `del${w.id}` ? 'danger' : 'ghost'}`}
          onClick={() => {
            if (confirm(`del${w.id}`)) {
              setHistoryOpen(null)
              deleteWorkout(w.id)
            }
          }}
        >
          {armed === `del${w.id}` ? 'Tap again to delete' : 'Delete'}
        </button>
      </div>
    </>
  )
}

function HistoryCard({ w }: { w: Workout }) {
  const { historyOpen, setHistoryOpen } = useNav()
  const open = historyOpen === w.id
  const v = workoutVolume(w)

  return (
    <article className={`hist card${open ? ' open' : ''}`}>
      <button className="hist-head" aria-expanded={open} onClick={() => setHistoryOpen(open ? null : w.id)}>
        <div className="grow">
          <h3>{w.name}</h3>
          <p className="num">
            {fmtDate(w.startedAt)} · {fmtDur(w.durationSec ?? 0)}
            {v ? ` · ${fmtVol(v)}` : ''}
            {w.sample ? ' · Sample' : ''}
          </p>
        </div>
        <span className="chev">
          <Icon name="chev" />
        </span>
      </button>

      {w.prs && w.prs.length > 0 && (
        <div className="hist-prs">
          {w.prs.map((p) => (
            <span className="chip pr" key={p}>
              PR · {p}
            </span>
          ))}
        </div>
      )}

      {!open && <div className="hist-sum">{w.exercises.map((e) => e.name).join(', ')}</div>}

      {open && (
        <div className="hist-body">
          <WorkoutDetail w={w} />
        </div>
      )}
    </article>
  )
}
