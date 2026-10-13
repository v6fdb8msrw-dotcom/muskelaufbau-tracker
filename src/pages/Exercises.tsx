import { ArrowLeft, ArrowRight, PlayCircle, Wind } from 'lucide-react'
import { useMemo } from 'react'
import { LineChart, type LineSeries } from '../components/charts'
import { ExerciseFigure } from '../components/ExerciseFigure'
import { Card, CardHead, Disclosure, Empty, Notice, PageHead } from '../components/ui'
import { EXERCISE_MAP, EXERCISES, MUSCLE_GROUP_LABEL } from '../data/exercises'
import { PICTOGRAMS } from '../data/pictograms'
import { SESSIONS } from '../data/plan'
import { estimated1RM, videoSearchUrl } from '../domain/training'
import { num } from '../lib/format'
import { href, type Route } from '../state/router'
import { useStore } from '../state/store'
import type { Exercise, WorkoutLog } from '../types'

export default function Exercises({ route }: { route: Route }) {
  const id = route.segments[1]
  if (id && EXERCISE_MAP[id]) return <ExerciseDetail exercise={EXERCISE_MAP[id]} />
  const planIds = [...new Set(SESSIONS.flatMap((x) => [x.warmup?.exerciseId, ...x.exercises.map((e) => e.exerciseId), x.finisher?.exerciseId]).filter(Boolean) as string[])]
  const others = EXERCISES.filter((e) => !planIds.includes(e.id))
  return (
    <div className="page">
      <PageHead eyebrow={`${planIds.length} Übungen im Plan`} title="Übungen" />
      <div className="grid grid-auto">
        {planIds.map((pid, i) => {
          const e = EXERCISE_MAP[pid]
          return (
            <a key={pid} href={href(`/uebungen/${pid}`)} className="card hoverable exercise-card" style={{ textDecoration: 'none', ['--i' as string]: i }}>
              <ExerciseFigure id={pid} className="thumb" />
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="card-title">{e.name}</div>
                <ArrowRight size={16} color="var(--ink-3)" />
              </div>
              <div className="muted small">{e.muscles.slice(0, 3).join(' · ')}</div>
              {e.later && <span className="badge" style={{ alignSelf: 'flex-start' }}>Kettlebell-Ersatz</span>}
            </a>
          )
        })}
      </div>
      {others.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Disclosure title={`Weitere Übungen (${others.length})`}>
            <div className="list">
              {others.map((e) => (
                <a key={e.id} href={href(`/uebungen/${e.id}`)} className="list-item" style={{ textDecoration: 'none' }}>
                  <div className="grow">
                    <div className="title">{e.name}</div>
                    <div className="meta">{MUSCLE_GROUP_LABEL[e.group]}</div>
                  </div>
                  <ArrowRight size={16} color="var(--ink-3)" />
                </a>
              ))}
            </div>
          </Disclosure>
        </div>
      )}
    </div>
  )
}

export function exerciseSeries(workouts: WorkoutLog[], ex: Exercise): LineSeries[] {
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
  const sides: (undefined | 'left' | 'right')[] = ex.unilateral ? ['left', 'right'] : [undefined]
  return sides.map((side) => {
    const points: { x: string; y: number }[] = []
    for (const w of sorted) {
      const log = w.exercises.find((e) => e.exerciseId === ex.id)
      if (!log) continue
      const sets = log.sets.filter((s) => (ex.unilateral ? s.side === side : true))
      if (!sets.length) continue
      const value =
        ex.measure === 'time'
          ? Math.max(...sets.map((s) => s.seconds ?? 0))
          : ex.bodyweight
            ? Math.max(...sets.map((s) => s.reps ?? 0))
            : Math.max(...sets.map((s) => estimated1RM(s.weightKg ?? 0, s.reps ?? 0)))
      if (value > 0) points.push({ x: w.date, y: value })
    }
    return {
      id: side ?? 'both',
      label: side === 'left' ? 'Links' : side === 'right' ? 'Rechts' : ex.name,
      points,
      variant: side === 'right' ? 'main' : 'neon',
      dots: true,
    }
  })
}

function ExerciseDetail({ exercise: ex }: { exercise: Exercise }) {
  const { data } = useStore()
  const series = useMemo(() => exerciseSeries(data.workouts, ex), [data.workouts, ex])
  const usedIn = SESSIONS.filter((s) => s.exercises.some((e) => e.exerciseId === ex.id || (ex.id === 'reverse-fly' && e.exerciseId === 'ueberzuege')))
  const metric = ex.measure === 'time' ? 'Längste Haltezeit (s)' : ex.bodyweight ? 'Meiste Wiederholungen' : 'Geschätztes 1-Wiederholungs-Maximum (kg)'
  return (
    <div className="page">
      <a href={href('/uebungen')} className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}>
        <ArrowLeft size={15} /> Alle Übungen
      </a>
      <PageHead
        eyebrow={MUSCLE_GROUP_LABEL[ex.group]}
        title={ex.name}
        lead={`Trainiert: ${ex.muscles.join(', ')}. Ausrüstung: ${ex.equipment.join(', ')}.`}
      />
      <Card index={0} className="tut-card" style={{ marginBottom: 18 }}>
        <div className="tut-card-grid">
          {PICTOGRAMS[ex.id] && (
            <div className="tut-figure">
              <ExerciseFigure id={ex.id} />
            </div>
          )}
          <div className="stack">
            <div className="eyebrow">Kurz erklärt</div>
            <ol className="tut-cues">
              {(ex.cues ?? ex.execution.slice(0, 3)).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            {ex.later && <div className="muted small">{ex.later}</div>}
            <a className="btn btn-primary" style={{ alignSelf: 'flex-start' }} href={videoSearchUrl(ex.video ?? ex.name)} target="_blank" rel="noopener noreferrer">
              <PlayCircle size={16} /> Kurzvideos ansehen
            </a>
          </div>
        </div>
      </Card>
      <div className="exercise-hero" style={{ marginBottom: 18 }}>
        <Card index={0}>
          <CardHead eyebrow="Schritt 1" title="Ausgangsposition" />
          <ul className="bullets">
            {ex.start.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card index={1}>
          <CardHead eyebrow="Schritt 2" title="Ausführung" />
          <ol className="steps">
            {ex.execution.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Card index={2}>
          <CardHead eyebrow="Atmung" title="So atmest du" action={<Wind size={18} color="var(--ink-3)" />} />
          <p className="small">{ex.breathing}</p>
        </Card>
        <Card index={3}>
          <CardHead eyebrow="Achtung" title="Typische Fehler" />
          <ul className="bullets">
            {ex.mistakes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card index={4}>
          <CardHead eyebrow="Sicherheit" title="Hinweise" />
          <ul className="bullets">
            {ex.safety.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="grid grid-3">
        <Card index={5}>
          <CardHead eyebrow="Varianten" title="Leichter, schwerer, später" />
          <ul className="bullets">
            {ex.variants.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {usedIn.length > 0 && (
            <div className="muted small" style={{ marginTop: 14 }}>
              Im Plan: {usedIn.map((s) => s.short).join(', ')}
            </div>
          )}
        </Card>
        <Card index={6} className="span-2">
          <CardHead eyebrow="Dein Verlauf" title={metric} />
          {series.every((s) => !s.points.length) ? (
            <Empty>Noch keine Sätze protokolliert.</Empty>
          ) : (
            <>
              <LineChart series={series} unit={ex.measure === 'time' ? 's' : ex.bodyweight ? '' : 'kg'} decimals={ex.measure === 'time' || ex.bodyweight ? 0 : 1} />
              {ex.unilateral && (
                <div className="legend" style={{ marginTop: 8 }}>
                  <span>
                    <span className="dot neon" /> Links
                  </span>
                  <span>
                    <span className="dot" style={{ background: 'var(--ink)' }} /> Rechts
                  </span>
                </div>
              )}
              <div className="muted tiny" style={{ marginTop: 6 }}>
                {!ex.bodyweight && ex.measure !== 'time' && 'Das 1RM ist nur ein rechnerischer Vergleichswert (Epley-Formel), kein Maximaltest.'} Letzter Wert:{' '}
                {series.map((s) => (s.points.length ? `${s.label} ${num(s.points[s.points.length - 1].y, 1)}` : '')).filter(Boolean).join(' · ')}
              </div>
            </>
          )}
        </Card>
      </div>
      {ex.id === 'ueberzuege' && (
        <div style={{ marginTop: 18 }}>
          <Notice>Wenn Überzüge sich mit deiner Ausstattung nicht sicher oder bequem anfühlen, stelle im Trainingsplan auf „Reverse Fly“ um.</Notice>
        </div>
      )}
    </div>
  )
}
