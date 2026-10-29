import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { countsByDay, dayKey, monthView, sessionsPerWeek, weekStreak } from '../../domain/consistency'
import { DIST_UNIT, fmtDur, fmtN, fmtVol } from '../../domain/format'
import { workoutVolume } from '../../domain/math'
import type { Activity, Workout } from '../../domain/types'
import { useLogActivity } from '../../state/ActivityUI'
import { useNav } from '../../state/Nav'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const POP_W = 248

const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

interface Pos {
  left: number
  top: number
  below: boolean
}

export function ConsistencyCalendar({ workouts, activities, now }: { workouts: Workout[]; activities: Activity[]; now: Date }) {
  const [offset, setOffset] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const logActivity = useLogActivity()
  const { showInHistory } = useNav()

  const all = useMemo(() => [...workouts, ...activities], [workouts, activities])
  const counts = useMemo(() => countsByDay(workouts), [workouts])
  const actCounts = useMemo(() => countsByDay(activities), [activities])
  const byDay = useMemo(() => {
    const m = new Map<string, { w: Workout[]; a: Activity[] }>()
    const slot = (k: string) => m.get(k) ?? m.set(k, { w: [], a: [] }).get(k)!
    for (const w of workouts) slot(dayKey(w.startedAt)).w.push(w)
    for (const a of activities) slot(dayKey(a.startedAt)).a.push(a)
    return m
  }, [workouts, activities])

  const shown = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const view = monthView(shown.getFullYear(), shown.getMonth(), counts, now, actCounts)
  const label = shown.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const activeKey = pin ?? hover

  // Place the popover above the day (below for the top rows), clamped inside the card.
  const place = (el: HTMLElement) => {
    const box = wrap.current?.getBoundingClientRect()
    if (!box) return
    const r = el.getBoundingClientRect()
    const w = Math.min(POP_W, box.width)
    const center = r.left - box.left + r.width / 2
    const below = r.top - box.top < 170
    setPos({ left: Math.max(0, Math.min(box.width - w, center - w / 2)), top: below ? r.bottom - box.top + 8 : r.top - box.top - 8, below })
  }
  const cancelClose = () => window.clearTimeout(timer.current)
  const closeSoon = () => {
    cancelClose()
    timer.current = window.setTimeout(() => setHover(null), 140)
  }
  const reset = () => {
    cancelClose()
    setHover(null)
    setPin(null)
  }

  useEffect(() => {
    if (!pin) return
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setPin(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPin(null)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', esc)
    }
  }, [pin])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const active = activeKey ? byDay.get(activeKey) ?? { w: [], a: [] } : null
  const activeDate = activeKey ? keyToDate(activeKey) : null
  const activeFuture = activeKey ? activeKey > dayKey(now) : false

  return (
    <section className="card pad" aria-label="Consistency calendar">
      <div className="card-h">
        <h2>Consistency</h2>
        <div className="monthnav">
          <button
            className="icon round"
            aria-label="Previous month"
            onClick={() => {
              reset()
              setOffset(offset - 1)
            }}
          >
            <span className="rot90">
              <Icon name="chev" size={16} />
            </span>
          </button>
          <span>{label}</span>
          <button
            className="icon round"
            aria-label="Next month"
            disabled={offset >= 0}
            onClick={() => {
              reset()
              setOffset(offset + 1)
            }}
          >
            <span className="rot-90">
              <Icon name="chev" size={16} />
            </span>
          </button>
        </div>
      </div>
      <div className="cal-wrap" ref={wrap}>
        <div className="cal" role="grid" aria-label={label}>
          {DOW.map((d, i) => (
            <span className="dow" key={i}>
              {d}
            </span>
          ))}
          {view.cells.map((c, i) => {
            if (!c) return <span key={`p${i}`} />
            const cls = `day${c.count ? ' on' : c.acts ? ' act' : ''}${c.count && c.acts ? ' both' : ''}${c.today ? ' today' : ''}${c.future ? ' future' : ''}`
            if (c.future)
              return (
                <span key={c.key} className={cls}>
                  {c.day}
                </span>
              )
            const summary = [c.count && plural(c.count, 'workout', 'workouts'), c.acts && plural(c.acts, 'activity', 'activities')].filter(Boolean).join(', ') || 'rest day'
            return (
              <button
                key={c.key}
                className={`${cls}${activeKey === c.key ? ' sel' : ''}`}
                aria-label={`${keyToDate(c.key).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}: ${summary}`}
                aria-expanded={activeKey === c.key}
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse' || pin) return
                  cancelClose()
                  setHover(c.key)
                  place(e.currentTarget)
                }}
                onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
                onFocus={(e) => {
                  if (pin) return
                  setHover(c.key)
                  place(e.currentTarget)
                }}
                onBlur={closeSoon}
                onClick={(e) => {
                  if (pin === c.key) return setPin(null)
                  cancelClose()
                  setHover(null)
                  setPin(c.key)
                  place(e.currentTarget)
                }}
              >
                {c.day}
              </button>
            )
          })}
        </div>

        {active && activeDate && pos && (
          <div
            className="dp"
            role="dialog"
            aria-label={activeDate.toLocaleDateString()}
            style={{ left: pos.left, top: pos.top, width: Math.min(POP_W, wrap.current?.clientWidth ?? POP_W), transform: pos.below ? undefined : 'translateY(-100%)' }}
            onPointerEnter={cancelClose}
            onPointerLeave={(e) => e.pointerType === 'mouse' && !pin && closeSoon()}
          >
            <h4>{activeDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            {active.w.map((w) => {
              const v = workoutVolume(w)
              return (
                <button className="dp-row" key={w.id} onClick={() => showInHistory(w.id)}>
                  <i className="k kl" />
                  <span>
                    <b>{w.name}</b>
                    <small className="num">
                      {[w.durationSec ? fmtDur(w.durationSec) : '', v ? fmtVol(v) : '', w.prs?.length ? `${w.prs.length} PR` : ''].filter(Boolean).join(' · ') || 'Lifting'}
                    </small>
                  </span>
                </button>
              )
            })}
            {active.a.map((a) => (
              <div className="dp-row" key={a.id}>
                <i className="k ka" />
                <span>
                  <b>{a.kind}</b>
                  <small className="num">
                    {[a.durationMin ? `${fmtN(a.durationMin)} min` : '', a.distance ? `${fmtN(a.distance)} ${DIST_UNIT}` : ''].filter(Boolean).join(' · ') || 'Logged'}
                  </small>
                </span>
              </div>
            ))}
            {!active.w.length && !active.a.length && <p className="dp-empty">{activeFuture ? 'Nothing planned.' : 'Rest day. Nothing logged.'}</p>}
            {!activeFuture && (
              <button
                className="link dp-add"
                onClick={() => {
                  const d = activeDate
                  reset()
                  logActivity(d)
                }}
              >
                + Log activity for this day
              </button>
            )}
          </div>
        )}

        <dl className="cal-stats">
          <div>
            <dt>Active days</dt>
            <dd className="num">{view.activeDays}</dd>
          </div>
          <div>
            <dt>Rest days</dt>
            <dd className="num">{view.restDays}</dd>
          </div>
          <div>
            <dt>Week streak</dt>
            <dd className="num">{weekStreak(all, now)}</dd>
          </div>
          <div>
            <dt>Per week</dt>
            <dd className="num">{sessionsPerWeek(all, now)}</dd>
          </div>
        </dl>
        <div className="cal-foot">
          <span className="legend">
            <i className="k kl" />
            Lifting <i className="k ka" />
            Other activity
          </span>
          <button className="btn ghost sm" onClick={() => logActivity()}>
            + Log activity
          </button>
        </div>
      </div>
    </section>
  )
}
