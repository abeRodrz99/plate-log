import { useEffect, useMemo, useRef, useState } from 'react'
import { EXERCISE_TYPE_LABEL } from '../domain/library'
import type { ExerciseType } from '../domain/types'
import { useApp } from '../state/AppState'
import { BottomSheet } from './BottomSheet'

interface Props {
  onPick(name: string, type: ExerciseType): void
  onClose(): void
}

export function ExercisePicker({ onPick, onClose }: Props) {
  const { exercisePool } = useApp()
  const [q, setQ] = useState('')
  const [newType, setNewType] = useState<ExerciseType>('wr')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [])

  const ql = q.trim().toLowerCase()
  const names = useMemo(() => {
    let list = [...exercisePool.keys()]
    if (ql) list = list.filter((n) => n.toLowerCase().includes(ql))
    list.sort((a, b) => {
      const as = a.toLowerCase().startsWith(ql) ? 0 : 1
      const bs = b.toLowerCase().startsWith(ql) ? 0 : 1
      return as - bs || a.localeCompare(b)
    })
    return list.slice(0, 50)
  }, [exercisePool, ql])
  const exact = names.some((n) => n.toLowerCase() === ql)

  return (
    <BottomSheet label="Add exercise" onClose={onClose}>
      {(close) => (
        <>
          <div className="sheet-head">
            <input
              ref={input}
              type="search"
              placeholder="Search or type a new exercise"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn ghost sm" onClick={() => close()}>
              Close
            </button>
          </div>
          <div className="pk-list">
            {ql && !exact && (
              <div className="pk-new">
                <select aria-label="Exercise type" value={newType} onChange={(e) => setNewType(e.target.value as ExerciseType)}>
                  <option value="wr">Weight × reps</option>
                  <option value="time">Timed (seconds)</option>
                  <option value="dist">Distance (meters)</option>
                </select>
                <button
                  className="btn sm"
                  onClick={() => {
                    onPick(q.trim(), newType)
                    close()
                  }}
                >
                  Create “{q.trim().slice(0, 28)}”
                </button>
              </div>
            )}
            {names.map((n) => {
              const type = exercisePool.get(n) as ExerciseType
              return (
                <button
                  key={n}
                  className="pk"
                  onClick={() => {
                    onPick(n, type)
                    close()
                  }}
                >
                  <span>{n}</span>
                  <small>{EXERCISE_TYPE_LABEL[type].tag}</small>
                </button>
              )
            })}
            {!names.length && !ql && <p className="muted" style={{ padding: '12px 4px' }}>No exercises yet.</p>}
          </div>
        </>
      )}
    </BottomSheet>
  )
}
