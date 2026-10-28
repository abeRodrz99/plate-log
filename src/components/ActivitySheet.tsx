import { useState } from 'react'
import { DIST_UNIT, fmtN, uid } from '../domain/format'
import { ACTIVITY_KINDS, type ActivityKind } from '../domain/types'
import { useApp } from '../state/AppState'
import { BottomSheet } from './BottomSheet'
import { NumField } from './NumField'

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * Quick log for runs, rides and so on. These only feed the consistency views:
 * no templates, sets or programs, which stay lifting-only.
 */
export function ActivitySheet({ onClose }: { onClose(): void }) {
  const { saveActivity, toast } = useApp()
  const [kind, setKind] = useState<ActivityKind>('Run')
  const [date, setDate] = useState(toInput(new Date()))
  const [minutes, setMinutes] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  const save = (close: () => void) => {
    const [y, m, d] = date.split('-').map(Number)
    if (!y) return
    // Noon keeps the entry on the picked day whatever the time zone does at midnight.
    const startedAt = new Date(y, m - 1, d, 12).getTime()
    saveActivity({ id: uid('a_'), kind, startedAt, durationMin: minutes, distance, notes: '' })
    toast(`${kind}${distance ? ` · ${fmtN(distance)} ${DIST_UNIT}` : ''} added to your consistency.`)
    close()
  }

  return (
    <BottomSheet label="Log activity" onClose={onClose}>
      {(close) => (
        <>
          <div className="sheet-head">
            <h2 className="sheet-title">Log activity</h2>
          </div>
          <p className="muted sheet-note">Counts toward your consistency calendar and streak. Lifting plans stay lifting-only.</p>
          <div className="kinds" role="radiogroup" aria-label="Activity type">
            {ACTIVITY_KINDS.map((k) => (
              <button key={k} role="radio" aria-checked={kind === k} className={`kind${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
          <label className="lbl" htmlFor="act-date">Date</label>
          <input id="act-date" type="date" className="dateinp" value={date} max={toInput(new Date())} onChange={(e) => setDate(e.target.value)} />
          <div className="two">
            <div>
              <span className="lbl">Minutes <small>(optional)</small></span>
              <div className="numbox"><NumField label="Minutes" value={minutes} onValue={setMinutes} placeholder="45" /></div>
            </div>
            <div>
              <span className="lbl">{DIST_UNIT} <small>(optional)</small></span>
              <div className="numbox"><NumField label={`Distance in ${DIST_UNIT}`} value={distance} onValue={setDistance} placeholder="5" /></div>
            </div>
          </div>
          <button className="btn block" style={{ marginTop: 16 }} onClick={() => save(close)}>
            Add activity
          </button>
        </>
      )}
    </BottomSheet>
  )
}
