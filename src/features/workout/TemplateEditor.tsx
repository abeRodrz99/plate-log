import { useState } from 'react'
import { ExercisePicker } from '../../components/ExercisePicker'
import { Icon } from '../../components/Icon'
import { uid } from '../../domain/format'
import { EXERCISE_TYPE_LABEL } from '../../domain/library'
import type { ExerciseType, Template } from '../../domain/types'
import { useConfirm } from '../../lib/useConfirm'
import { useApp } from '../../state/AppState'

interface DraftExercise {
  name: string
  type: ExerciseType
  sets: string
  reps: string
}

interface Props {
  /** Null creates a new template. */
  template: Template | null
  onDone(): void
}

export function TemplateEditor({ template, onDone }: Props) {
  const { saveTemplate, deleteTemplate } = useApp()
  const { armed, confirm } = useConfirm()
  const isNew = template === null
  const [id] = useState(() => template?.id ?? uid('t_'))
  const [name, setName] = useState(template?.name ?? '')
  const [rows, setRows] = useState<DraftExercise[]>(
    () => template?.exercises.map((e) => ({ name: e.name, type: e.type, sets: String(e.sets), reps: e.reps })) ?? [],
  )
  const [picking, setPicking] = useState(false)

  const patch = (i: number, p: Partial<DraftExercise>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d
      if (j < 0 || j >= r.length) return r
      const next = [...r]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = () => {
    saveTemplate({
      id,
      name: name.trim() || 'Untitled template',
      updatedAt: Date.now(),
      exercises: rows.map((x) => {
        const n = parseInt(x.sets, 10)
        return { name: x.name, type: x.type, sets: Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 1, reps: x.reps.trim() }
      }),
    })
    onDone()
  }

  return (
    <div className="narrow">
      <div className="top">
        <h1>{isNew ? 'New template' : 'Edit template'}</h1>
        <button className="btn sm" onClick={save}>
          Save
        </button>
      </div>

      <label className="lbl" htmlFor="tname" style={{ marginTop: 4 }}>
        Name
      </label>
      <input type="text" id="tname" value={name} placeholder="Template name" onChange={(e) => setName(e.target.value)} />

      <div className="sect">
        <h2>Exercises</h2>
      </div>

      {rows.length > 0 ? (
        <div className="rows">
          {rows.map((x, i) => (
            <div className="tx" key={`${x.name}-${i}`}>
              <div>
                <h3>{x.name}</h3>
                <span className="tag">{EXERCISE_TYPE_LABEL[x.type].tag}</span>
              </div>
              <div className="acts">
                <button className="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="up" />
                </button>
                <button className="icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="down" />
                </button>
                <button className="icon" aria-label="Remove" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                  <Icon name="x" />
                </button>
              </div>
              <div className="fields">
                <label>
                  Sets{' '}
                  <input type="text" inputMode="numeric" className="num" value={x.sets} onChange={(e) => patch(i, { sets: e.target.value })} />
                </label>
                <label>
                  Target {EXERCISE_TYPE_LABEL[x.type].col.toLowerCase()}{' '}
                  <input
                    type="text"
                    className="reps num"
                    placeholder="e.g. 6-8"
                    value={x.reps}
                    onChange={(e) => patch(i, { reps: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <b>No exercises</b>Add the lifts in the order you do them.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn ghost" onClick={() => setPicking(true)}>
          + Add exercise
        </button>
        <button className="btn ghost" onClick={onDone}>
          Cancel
        </button>
        {!isNew && (
          <button
            className={`btn ${armed === 't-del' ? 'danger' : 'ghost'}`}
            onClick={() => {
              if (confirm('t-del')) {
                deleteTemplate(id)
                onDone()
              }
            }}
          >
            {armed === 't-del' ? 'Tap again to delete' : 'Delete template'}
          </button>
        )}
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(n, type) => setRows((r) => [...r, { name: n, type, sets: '3', reps: '' }])}
        />
      )}
    </div>
  )
}
