import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fmtDate, fmtShort } from '../../domain/format'
import { useWidth } from '../../lib/useWidth'
import { nearestIndex, yScale, type SeriesPoint } from './chartMath'

const PL = 44
const PR = 18
const PT = 16
const PB = 30

const round1 = (n: number) => Math.round(n * 10) / 10

interface Props {
  points: SeriesPoint[]
  unit: string
  /** Re-runs the draw-in animation when this changes (lift, metric, range). */
  animKey: string
  selectedId: string | null
  onSelect(id: string | null): void
}

/**
 * Scrub with a mouse or finger to read any session; click or tap to pin it
 * (which also opens it in the list below). Arrow keys step between sessions.
 * With nothing hovered or pinned, the latest session is shown.
 */
export function Chart({ points, unit, animKey, selectedId, onSelect }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = W < 520 ? 220 : 280

  const values = points.map((p) => p.v)
  const { min, max, ticks } = yScale(values)
  const tmin = points[0].t
  const tmax = points[points.length - 1].t
  const X = (t: number) => (tmax === tmin ? (PL + (W - PR)) / 2 : PL + ((t - tmin) / (tmax - tmin)) * (W - PL - PR))
  const Y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB)
  const xs = points.map((p) => X(p.t))

  const selI = selectedId ? points.findIndex((p) => p.id === selectedId) : -1
  const activeI = hover ?? (selI >= 0 ? selI : points.length - 1)
  const a = points[activeI]
  const ax = xs[activeI]

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ')
  const nTicks = W < 420 ? 3 : 5
  const xTicks = tmax === tmin ? [tmin] : Array.from({ length: nTicks }, (_, i) => tmin + ((tmax - tmin) * i) / (nTicks - 1))

  const idxAt = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return nearestIndex(xs, e.clientX - r.left)
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (e.key === 'Home' || e.key === 'End' || step) {
      e.preventDefault()
      const i = e.key === 'Home' ? 0 : e.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, activeI + step))
      onSelect(points[i].id)
    }
  }

  // Keep the tooltip fully inside the card.
  const TIP_W = 168
  const left = Math.max(4, Math.min(W - TIP_W - 4, ax - TIP_W / 2))

  return (
    <div className="chart-box" ref={ref}>
      <div className="tip" style={{ left, width: TIP_W }} aria-live="polite">
        <span className="tip-d">{fmtDate(a.t)}</span>
        <b className="num">
          {round1(a.v)} <small>{unit}</small>
        </b>
        <span className="tip-s num">{a.sets}</span>
        {a.pr && <span className="chip pr">PR</span>}
      </div>
      <svg
        key={animKey}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={`Progress chart, ${points.length} sessions. Use arrow keys to step through them.`}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={(e) => {
          const i = idxAt(e)
          setHover(i)
          if (e.buttons > 0 && e.pointerType !== 'mouse') onSelect(points[i].id)
        }}
        onPointerDown={(e) => {
          const i = idxAt(e)
          setHover(i)
          onSelect(selectedId === points[i].id && e.pointerType === 'mouse' ? null : points[i].id)
        }}
        onPointerLeave={() => setHover(null)}
        onPointerCancel={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} />
            <text className="ax" x={PL - 8} y={Y(v) + 4} textAnchor="end">
              {round1(v)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text key={i} className="ax" x={X(t)} y={H - 8} textAnchor={xTicks.length === 1 ? 'middle' : i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}>
            {fmtShort(t)}
          </text>
        ))}
        {points.length > 1 && (
          <>
            <path className="area" d={`${line} L${X(tmax).toFixed(1)} ${Y(min)} L${X(tmin).toFixed(1)} ${Y(min)} Z`} />
            <path className="ln draw" pathLength={1} d={line} />
          </>
        )}
        <line className="xhair" x1={ax} x2={ax} y1={PT} y2={H - PB} />
        {points.map((p, i) => (
          <circle key={p.id} className={`pt${p.pr ? ' pr' : ''}${i === activeI ? ' on' : ''}`} cx={xs[i]} cy={Y(p.v)} r={i === activeI ? 6 : p.pr ? 4.5 : 3.5} />
        ))}
      </svg>
    </div>
  )
}
