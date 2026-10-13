import { Fragment } from 'react'
import { PICTOGRAMS, type Frame, type Pictogram } from '../data/pictograms'
import { prefersReducedMotion } from './hooks'

/** Animierte Strichfigur einer Übung (Schleife zwischen Start- und Endposition). */
export function ExerciseFigure({ id, className = '' }: { id: string; className?: string }) {
  const pic = PICTOGRAMS[id]
  if (!pic) return null
  if (prefersReducedMotion()) {
    // Ohne Animation: Positionen nebeneinander
    return (
      <div className={`figure-frames ${className}`}>
        {pic.frames.map((f, i) => (
          <svg key={i} viewBox="0 0 200 140" className="exercise-figure" role="img" aria-label={pic.captions?.[i] ?? `Position ${i + 1}`}>
            <Scene pic={pic} frames={[f]} />
          </svg>
        ))}
      </div>
    )
  }
  return (
    <svg viewBox="0 0 200 140" className={`exercise-figure ${className}`} role="img" aria-label={pic.captions?.join(' → ') ?? 'Bewegungsablauf'}>
      <Scene pic={pic} frames={pic.frames} />
    </svg>
  )
}

function Scene({ pic, frames }: { pic: Pictogram; frames: Frame[] }) {
  const animated = frames.length > 1
  const seq = animated ? [...frames, frames[0]] : frames
  const dur = `${(pic.pace ?? 1.1) * frames.length}s`
  const keyTimes = seq.map((_, i) => (i / Math.max(1, seq.length - 1)).toFixed(3)).join(';')
  const keySplines = Array(Math.max(1, seq.length - 1)).fill('0.45 0 0.55 1').join(';')
  const first = seq[0]
  const anim = (attr: string, values: string) =>
    animated ? <animate attributeName={attr} values={values} dur={dur} keyTimes={keyTimes} calcMode="spline" keySplines={keySplines} repeatCount="indefinite" /> : null
  const vals = (p: string, axis: 0 | 1) => seq.map((f) => f[p][axis]).join(';')

  const line = (a: string, b: string, cls: string, key: string) => (
    <line key={key} className={cls} x1={first[a][0]} y1={first[a][1]} x2={first[b][0]} y2={first[b][1]}>
      {anim('x1', vals(a, 0))}
      {anim('y1', vals(a, 1))}
      {anim('x2', vals(b, 0))}
      {anim('y2', vals(b, 1))}
    </line>
  )

  return (
    <>
      <Props pic={pic} />
      {pic.thin?.map(([a, b], i) => line(a, b, 'fig-thin', `t${i}`))}
      {pic.far?.map(([a, b], i) => line(a, b, 'fig-far', `f${i}`))}
      {pic.db
        ?.filter((p) => pic.far?.some(([a, b]) => a === p || b === p) && !pic.segments.some(([a, b]) => a === p || b === p))
        .map((p) => (
          <Dumbbell key={`dbf${p}`} point={p} seq={seq} dur={dur} keyTimes={keyTimes} keySplines={keySplines} animated={animated} angle={pic.dbAngle} far />
        ))}
      {pic.segments.map(([a, b], i) => line(a, b, 'fig-line', `s${i}`))}
      <circle className="fig-head" cx={first[pic.head][0]} cy={first[pic.head][1]} r={8.5}>
        {anim('cx', vals(pic.head, 0))}
        {anim('cy', vals(pic.head, 1))}
      </circle>
      {pic.db
        ?.filter((p) => !(pic.far?.some(([a, b]) => a === p || b === p) && !pic.segments.some(([a, b]) => a === p || b === p)))
        .map((p) => (
          <Dumbbell key={`db${p}`} point={p} seq={seq} dur={dur} keyTimes={keyTimes} keySplines={keySplines} animated={animated} angle={pic.dbAngle} />
        ))}
    </>
  )
}

function Dumbbell({
  point,
  seq,
  dur,
  keyTimes,
  keySplines,
  animated,
  angle,
  far,
}: {
  point: string
  seq: Frame[]
  dur: string
  keyTimes: string
  keySplines: string
  animated: boolean
  angle?: number
  far?: boolean
}) {
  const [x, y] = seq[0][point]
  return (
    <g className={`fig-db ${far ? 'far' : ''}`} transform={`translate(${x} ${y})`}>
      {animated && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values={seq.map((f) => `${f[point][0]} ${f[point][1]}`).join(';')}
          dur={dur}
          keyTimes={keyTimes}
          calcMode="spline"
          keySplines={keySplines}
          repeatCount="indefinite"
        />
      )}
      <g transform={angle ? `rotate(${angle})` : undefined}>
        <rect x={-7} y={-1.5} width={14} height={3} rx={1.5} />
        <rect x={-10} y={-5} width={4} height={10} rx={1.5} />
        <rect x={6} y={-5} width={4} height={10} rx={1.5} />
      </g>
    </g>
  )
}

function Props({ pic }: { pic: Pictogram }) {
  const props = pic.props ?? ['boden']
  return (
    <g className="fig-props">
      {props.map((p) => (
        <Fragment key={p}>
          {p === 'boden' && <line x1={16} y1={127} x2={184} y2={127} />}
          {p === 'matte' &&
            (pic.view === 'oben' ? (
              <rect x={56} y={10} width={88} height={124} rx={10} className="fill" />
            ) : (
              <>
                <rect x={18} y={125} width={164} height={4} rx={2} className="fill" />
                <line x1={12} y1={129.5} x2={188} y2={129.5} />
              </>
            ))}
          {p === 'bank' && (
            <>
              <rect x={48} y={91} width={104} height={6} rx={2} className="fill" />
              <line x1={58} y1={97} x2={58} y2={127} />
              <line x1={142} y1={97} x2={142} y2={127} />
              <line x1={16} y1={127} x2={184} y2={127} />
            </>
          )}
          {p === 'ruderer' && (
            <>
              <line x1={26} y1={118} x2={176} y2={118} />
              <rect x={40} y={114} width={56} height={4} rx={2} className="fill" />
              <circle cx={164} cy={98} r={13} />
              <line x1={124} y1={104} x2={134} y2={118} />
              <line x1={16} y1={127} x2={184} y2={127} />
            </>
          )}
          {p === 'stuhl' && (
            <>
              <rect x={56} y={86} width={30} height={6} rx={2} className="fill" />
              <line x1={58} y1={92} x2={58} y2={127} />
              <line x1={84} y1={92} x2={84} y2={127} />
              <line x1={58} y1={86} x2={58} y2={50} />
              <line x1={16} y1={127} x2={184} y2={127} />
            </>
          )}
          {p === 'tisch' && (
            <>
              <rect x={66} y={60} width={108} height={6} rx={2} className="fill" />
              <line x1={74} y1={66} x2={74} y2={127} />
              <line x1={166} y1={66} x2={166} y2={127} />
              <line x1={16} y1={127} x2={184} y2={127} />
            </>
          )}
          {p === 'pad' && (
            <>
              <rect x={36} y={124} width={128} height={6} rx={3} className="fill" />
              <line x1={16} y1={131} x2={184} y2={131} />
            </>
          )}
        </Fragment>
      ))}
    </g>
  )
}
