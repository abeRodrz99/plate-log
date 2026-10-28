import { fmtVol } from '../../domain/format'
import { STARTER_TEMPLATES } from '../../domain/library'
import { workoutVolume } from '../../domain/math'
import type { Template } from '../../domain/types'
import { TemplateCard } from '../../components/TemplateCard'
import { useApp } from '../../state/AppState'

interface Props {
  onEdit(t: Template | null): void
}

export function WorkoutHome({ onEdit }: Props) {
  const { workouts, templates, startWorkout, addStarter } = useApp()

  const weekAgo = Date.now() - 7 * 86_400_000
  const week = workouts.filter((w) => w.startedAt >= weekAgo)
  const volume = week.reduce((a, w) => a + workoutVolume(w), 0)
  const sub = week.length
    ? `${week.length} ${week.length === 1 ? 'workout' : 'workouts'} in the last 7 days · ${fmtVol(volume)}`
    : 'No workouts in the last 7 days'

  const sorted = [...templates].sort((a, b) => a.name.localeCompare(b.name))
  const have = new Set(templates.map((t) => t.name))
  const starters = STARTER_TEMPLATES.map((s, i) => ({ s, i })).filter((x) => !have.has(x.s.name))

  return (
    <>
      <div className="top">
        <div>
          <h1>Workout</h1>
          <p className="sub">{sub}</p>
        </div>
      </div>

      <button className="btn block" onClick={() => startWorkout()}>
        Start empty workout
      </button>

      <div className="sect">
        <h2>Templates</h2>
        <button className="btn ghost sm" onClick={() => onEdit(null)}>
          + New
        </button>
      </div>

      {sorted.length > 0 ? (
        <div className="tgrid">
          {sorted.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              last={workouts.filter((w) => w.tid === t.id).sort((a, b) => b.startedAt - a.startedAt)[0]}
              onStart={() => startWorkout(t)}
              onEdit={() => onEdit(t)}
            />
          ))}
        </div>
      ) : (
        starters.length === 0 && (
          <div className="empty">
            <b>No templates yet</b>Build one for the lifts you repeat each week.
          </div>
        )
      )}

      {starters.length > 0 && (
        <>
          <div className="sect">
            <h2>Starter programs</h2>
          </div>
          <div className="rows">
            {starters.map(({ s, i }) => (
              <div className="row" key={s.name}>
                <div className="grow">
                  <h3>{s.name}</h3>
                  <p>{s.exercises.length} exercises · from your runner strength plan</p>
                </div>
                <button className="btn ghost sm" onClick={() => addStarter(i)}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
