import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { diffDays, formatDateShort } from '../lib/date'
import { num } from '../lib/format'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.max(240, el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

export interface LineSeries {
  id: string
  label: string
  points: { x: string; y: number }[]
  variant: 'neon' | 'main' | 'silver'
  dots?: boolean
}

function niceRange(min: number, max: number): [number, number, number] {
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)))
  const steps = [1, 2, 2.5, 5, 10].map((s) => s * step)
  const chosen = steps.find((s) => span / s <= 5) ?? steps[steps.length - 1]
  return [Math.floor(min / chosen) * chosen, Math.ceil(max / chosen) * chosen, chosen]
}

/** Liniendiagramm über Kalendertage, z. B. Gewicht mit 7-Tage-Durchschnitt. */
export function LineChart({
  series,
  height = 220,
  unit = '',
  decimals = 1,
  band,
  empty,
}: {
  series: LineSeries[]
  height?: number
  unit?: string
  decimals?: number
  band?: { from: number; to: number; label?: string }
  empty?: ReactNode
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const all = series.flatMap((s) => s.points)
  if (all.length === 0) return <div ref={ref}>{empty}</div>
  const dates = all.map((p) => p.x).sort()
  const x0 = dates[0]
  const x1 = dates[dates.length - 1]
  const spanDays = Math.max(1, diffDays(x1, x0))
  const ys = all.map((p) => p.y).concat(band ? [band.from, band.to] : [])
  const [yMin, yMax, yStep] = niceRange(Math.min(...ys), Math.max(...ys))
  const pad = { l: 44, r: 12, t: 12, b: 26 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const sx = (d: string) => pad.l + (diffDays(d, x0) / spanDays) * w
  const sy = (v: number) => pad.t + h - ((v - yMin) / (yMax - yMin || 1)) * h
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) ticks.push(v)
  const xLabels = [x0, ...(spanDays > 6 ? [dates[Math.floor(dates.length / 2)]] : []), x1].filter((d, i, a) => a.indexOf(d) === i)

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg className="chart" width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(', ')}>
        {band && (
          <rect x={pad.l} width={w} y={sy(band.to)} height={Math.max(0, sy(band.from) - sy(band.to))} fill="rgba(60,240,124,0.09)" rx={4} />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={pad.l + w} y1={sy(t)} y2={sy(t)} />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">
              {num(t, decimals)}
              {unit && t === ticks[ticks.length - 1] ? ` ${unit}` : ''}
            </text>
          </g>
        ))}
        {xLabels.map((d) => (
          <text key={d} x={sx(d)} y={height - 6} textAnchor={d === x0 ? 'start' : d === x1 ? 'end' : 'middle'}>
            {formatDateShort(d)}
          </text>
        ))}
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.x.localeCompare(b.x))
          if (!pts.length) return null
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
          const cls = s.variant === 'neon' ? 'line-neon' : s.variant === 'silver' ? 'line-silver' : 'line-main'
          return (
            <g key={s.id}>
              {pts.length > 1 && <path className={`${cls} draw`} d={d} pathLength={1} style={{ ['--len' as string]: 1 }} />}
              {(s.dots || pts.length === 1) &&
                pts.map((p) => (
                  <circle key={p.x} className="pt" cx={sx(p.x)} cy={sy(p.y)} r={pts.length > 40 ? 2 : 3.2}>
                    <title>
                      {formatDateShort(p.x)}: {num(p.y, decimals)} {unit}
                    </title>
                  </circle>
                ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Säulendiagramm, z. B. Kalorien pro Tag mit Ziel-Linie. */
export function BarChart({
  data,
  height = 180,
  target,
  unit = '',
  format = (v: number) => num(v),
}: {
  data: { label: string; value?: number; highlight?: boolean; muted?: boolean }[]
  height?: number
  target?: number
  unit?: string
  format?: (v: number) => string
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const max = Math.max(target ?? 0, ...data.map((d) => d.value ?? 0)) * 1.12 || 1
  const pad = { l: 8, r: 8, t: 18, b: 24 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const bw = w / Math.max(data.length, 1)
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg className="chart" width={width} height={height} role="img">
        {target !== undefined && (
          <>
            <line x1={pad.l} x2={pad.l + w} y1={pad.t + h - (target / max) * h} y2={pad.t + h - (target / max) * h} style={{ stroke: 'var(--ink)' }} strokeOpacity={0.35} strokeDasharray="4 4" />
            <text x={pad.l + w} y={pad.t + h - (target / max) * h - 5} textAnchor="end">
              Ziel {format(target)} {unit}
            </text>
          </>
        )}
        {data.map((d, i) => {
          const v = d.value ?? 0
          const bh = (v / max) * h
          const x = pad.l + i * bw + bw * 0.2
          const reached = target !== undefined && v >= target
          return (
            <g key={d.label + i}>
              <rect
                className="bar-rect"
                x={x}
                width={bw * 0.6}
                y={pad.t + h - bh}
                height={Math.max(bh, d.value === undefined ? 0 : 2)}
                rx={6}
                style={{ fill: d.value === undefined ? 'transparent' : reached ? 'var(--neon)' : d.muted ? 'var(--line-2)' : 'var(--ink-2)' }}
                opacity={d.highlight ? 1 : 0.92}
              >
                <title>
                  {d.label}: {d.value === undefined ? 'keine Daten' : `${format(v)} ${unit}`}
                </title>
              </rect>
              {d.value === undefined && (
                <rect x={x} width={bw * 0.6} y={pad.t + h - 14} height={14} rx={5} fill="none" style={{ stroke: 'var(--line-2)' }} strokeDasharray="3 3" />
              )}
              <text x={x + bw * 0.3} y={height - 6} textAnchor="middle" style={{ fontWeight: d.highlight ? 700 : 500, fill: d.highlight ? 'var(--ink)' : undefined }}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Sparkline({ values, width = 120, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - ((v - min) / (max - min || 1)) * (height - 6)}`)
  return (
    <svg className="chart" width={width} height={height} aria-hidden>
      <polyline className="line-neon" points={pts.join(' ')} />
    </svg>
  )
}
