import { useState } from 'react'
import { ElapsedClock } from '../../components/ElapsedClock'
import { ExercisePicker } from '../../components/ExercisePicker'
import { Icon } from '../../components/Icon'
import { NumField } from '../../components/NumField'
import { UNIT, fmtN, uid } from '../../domain/format'
import { EXERCISE_TYPE_LABEL } from '../../domain/library'
import { fmtSet, lastSets } from '../../domain/math'
import type { LoggedExercise, SetEntry } from '../../domain/types'
import { useConfirm } from '../../lib/useConfirm'
import { buzz } from '../../lib/spring'
import { blankSet, useApp } from '../../state/AppState'
import { useNav } from '../../state/Nav'

export function ActiveWorkout() {
  const { active, workouts, updateActive, discardActive, finishActive } = useApp()
  const { showInHistory } = useNav()
  const { armed, confirm } = useConfirm()
  const [picking, setPicking] = useState(false)

  if (!active) return null

  const setField = (ei: number, si: number, field: 'w' | 'r', v: number | null) =>
    updateActive((a) => {
      const s = a.exercises[ei].sets[si]
      s[field] = v
      if (!((s.r ?? 0) > 0) && s.done) s.done = false
    })

  const toggle = (ei: number, si: number) => {
    const wasDone = active.exercises[ei].sets[si].done
    if (!wasDone) buzz()
    updateActive((a) => {
      const e = a.exercises[ei]
      const s = e.sets[si]
      s.done = !s.done
      if (s.done) {
        // Tapping the check on an empty row fills in last time's numbers (or the target).
        const prev = lastSets(workouts, e.name)[si]
        if (s.r == null) s.r = prev && prev.r != null ? prev.r : parseFloat(e.target ?? '') || null
        if (s.w == null && prev && (prev.w ?? 0) > 0) s.w = prev.w
      }
    })
  }

  const finish = () => {
    const w = finishActive()
    if (w) showInHistory(w.id)
  }

  return (
    <>
      <div className="top">
        <button
          className={`btn sm ${armed === 'discard' ? 'danger' : 'ghost'}`}
          onClick={() => confirm('discard') && discardActive()}
        >
          {armed === 'discard' ? 'Tap again to discard' : 'Discard'}
        </button>
        <ElapsedClock since={active.startedAt} />
        <button className="btn sm" onClick={finish}>
          Finish
        </button>
      </div>

      <input
        type="text"
        className="wname"
        aria-label="Workout name"
        value={active.name}
        onChange={(e) => updateActive((a) => void (a.name = e.target.value))}
      />

      {active.exercises.length === 0 && (
        <div className="empty" style={{ marginBottom: 12 }}>
          <b>Nothing logged yet</b>Add your first exercise to start recording sets.
        </div>
      )}

      {active.exercises.map((ex, ei) => (
        <ExerciseCard
          key={ex.id}
          ex={ex}
          prev={lastSets(workouts, ex.name)}
          onRemove={() => updateActive((a) => void a.exercises.splice(ei, 1))}
          onAddSet={() => updateActive((a) => void a.exercises[ei].sets.push(blankSet()))}
          onRemoveSet={(si) => updateActive((a) => void a.exercises[ei].sets.splice(si, 1))}
          onField={(si, f, v) => setField(ei, si, f, v)}
          onToggle={(si) => toggle(ei, si)}
          onCopyPrev={(si) => {
            const p = lastSets(workouts, ex.name)[si]
            if (p) updateActive((a) => Object.assign(a.exercises[ei].sets[si], { w: p.w, r: p.r }))
          }}
        />
      ))}

      <button className="btn block ghost" onClick={() => setPicking(true)}>
        + Add exercise
      </button>

      <label className="lbl" htmlFor="wnotes">
        Notes
      </label>
      <textarea
        id="wnotes"
        rows={2}
        placeholder="How did it feel?"
        value={active.notes}
        onChange={(e) => updateActive((a) => void (a.notes = e.target.value))}
      />

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(name, type) =>
            updateActive((a) =>
              void a.exercises.push({
                id: uid('e_'),
                name,
                type,
                target: '',
                tsets: 3,
                sets: [blankSet(), blankSet(), blankSet()],
              }),
            )
          }
        />
      )}
    </>
  )
}

interface CardProps {
  ex: LoggedExercise
  prev: SetEntry[]
  onRemove(): void
  onAddSet(): void
  onRemoveSet(si: number): void
  onField(si: number, f: 'w' | 'r', v: number | null): void
  onToggle(si: number): void
  onCopyPrev(si: number): void
}

function ExerciseCard({ ex, prev, onRemove, onAddSet, onRemoveSet, onField, onToggle, onCopyPrev }: CardProps) {
  const label = EXERCISE_TYPE_LABEL[ex.type]
  return (
    <section className="ex card">
      <header className="ex-h">
        <h2>{ex.name}</h2>
        <span className="tag">{label.tag}</span>
        <button className="icon" onClick={onRemove} aria-label={`Remove ${ex.name}`}>
          <Icon name="trash" />
        </button>
      </header>
      {ex.target && (
        <p className="target">
          Target {ex.tsets ?? ex.sets.length} × {ex.target}
        </p>
      )}
      <div className="set head">
        <span>Set</span>
        <span>Previous</span>
        <span>{UNIT}</span>
        <span>{label.col}</span>
        <span />
        <span />
      </div>
      {ex.sets.map((s, si) => {
        const p = prev[si]
        return (
          <div className={`set${s.done ? ' done' : ''}`} key={si}>
            <span className="sn">{si + 1}</span>
            <button className="prev" disabled={!p} onClick={() => onCopyPrev(si)} aria-label="Copy previous set">
              {p ? fmtSet(ex.type, p) : '–'}
            </button>
            <NumField
              value={s.w}
              onValue={(v) => onField(si, 'w', v)}
              placeholder={p && (p.w ?? 0) > 0 ? fmtN(p.w) : ''}
              label={`Weight, set ${si + 1}`}
            />
            <NumField
              value={s.r}
              onValue={(v) => onField(si, 'r', v)}
              placeholder={ex.target || (p && p.r != null ? fmtN(p.r) : '')}
              label={`${label.col}, set ${si + 1}`}
            />
            <button className="tick" aria-pressed={s.done} aria-label={`Mark set ${si + 1} done`} onClick={() => onToggle(si)}>
              <Icon name="check" />
            </button>
            <button className="x" aria-label={`Remove set ${si + 1}`} onClick={() => onRemoveSet(si)}>
              <Icon name="x" />
            </button>
          </div>
        )
      })}
      <button className="btn ghost sm add-set" onClick={onAddSet}>
        + Add set
      </button>
    </section>
  )
}
