import { fmtShort } from '../../domain/format'
import { yScale, type Point } from './chartMath'

const W = 360
const H = 200
const PL = 40
const PR = 16
const PT = 22
const PB = 26

const round1 = (n: number) => Math.round(n * 10) / 10

export function Chart({ points }: { points: Point[] }) {
  const values = points.map((p) => p.v)
  const { min, max, ticks } = yScale(values)
  const tmin = points[0].t
  const tmax = points[points.length - 1].t
  const X = (t: number) => (tmax === tmin ? (PL + (W - PR)) / 2 : PL + ((t - tmin) / (tmax - tmin)) * (W - PL - PR))
  const Y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB)

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ')
  const lastI = points.length - 1
  const maxI = values.indexOf(Math.max(...values))
  const labelled = [...new Set([maxI, lastI])]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progress chart">
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} />
          <text className="ax" x={PL - 6} y={Y(v) + 4} textAnchor="end">
            {round1(v)}
          </text>
        </g>
      ))}
      {points.length > 1 && (
        <>
          <path className="area" d={`${line} L${X(tmax).toFixed(1)} ${Y(min)} L${X(tmin).toFixed(1)} ${Y(min)} Z`} />
          <path className="ln" d={line} />
        </>
      )}
      {points.map((p, i) => (
        <circle key={p.t} className={`pt${i === lastI ? ' last' : ''}`} cx={X(p.t)} cy={Y(p.v)} r={i === lastI ? 5 : 3.5} />
      ))}
      {labelled.map((i) => {
        const x = X(points[i].t)
        const anchor = x > W - PR - 28 ? 'end' : x < PL + 16 ? 'start' : 'middle'
        return (
          <text key={i} className="val" x={x} y={Y(points[i].v) - 10} textAnchor={anchor}>
            {round1(points[i].v)}
          </text>
        )
      })}
      <text className="ax" x={X(tmin)} y={H - 6} textAnchor={tmax === tmin ? 'middle' : 'start'}>
        {fmtShort(tmin)}
      </text>
      {tmax !== tmin && (
        <text className="ax" x={X(tmax)} y={H - 6} textAnchor="end">
          {fmtShort(tmax)}
        </text>
      )}
    </svg>
  )
}
