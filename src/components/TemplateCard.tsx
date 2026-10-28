import { fmtShort } from '../domain/format'
import type { Template, Workout } from '../domain/types'
import { Initials } from './Initials'

interface Props {
  t: Template
  last?: Workout
  onStart(): void
  onEdit?(): void
}

/** Plan card: round exercise badges, "N exercises · N sets", and when it was last done. */
export function TemplateCard({ t, last, onStart, onEdit }: Props) {
  const sets = t.exercises.reduce((a, e) => a + e.sets, 0)
  const today = last && new Date(last.startedAt).toDateString() === new Date().toDateString()
  return (
    <article className="tcard card">
      <button className="tcard-main" onClick={onStart} aria-label={`Start ${t.name}`}>
        <h3>{t.name}</h3>
        <p className="num">
          {t.exercises.length} exercises · {sets} sets
        </p>
        <span className="dots">
          {t.exercises.slice(0, 5).map((e, i) => (
            <Initials key={i} name={e.name} />
          ))}
          {t.exercises.length > 5 && <span className="dot more">+{t.exercises.length - 5}</span>}
        </span>
        <p className="names">{t.exercises.map((e) => e.name).join(', ')}</p>
        <span className={`status${today ? ' done' : ''}`}>
          {today ? 'Today' : last ? `Last ${fmtShort(last.startedAt)}` : 'Not done yet'}
        </span>
      </button>
      {onEdit && (
        <button className="btn ghost sm tcard-edit" onClick={onEdit}>
          Edit
        </button>
      )}
    </article>
  )
}
