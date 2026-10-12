import { ArrowRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LineChart } from '../components/charts'
import { Card, CardHead, Empty, PageHead, Seg } from '../components/ui'
import { CORE_EXERCISES, EXERCISE_MAP } from '../data/exercises'
import { SESSIONS } from '../data/plan'
import { formatDate } from '../lib/date'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { exerciseSeries } from './Exercises'

export default function Core() {
  const { data } = useStore()
  const [selected, setSelected] = useState(CORE_EXERCISES[0])
  const ex = EXERCISE_MAP[selected]
  const series = useMemo(() => exerciseSeries(data.workouts, ex), [data.workouts, ex])
  const history = useMemo(
    () =>
      [...data.workouts]
        .sort((a, b) => b.date.localeCompare(a.date))
        .flatMap((w) => w.exercises.filter((e) => e.exerciseId === selected).map((e) => ({ date: w.date, title: w.title, sets: e.sets })))
        .slice(0, 8),
    [data.workouts, selected],
  )
  return (
    <div className="page">
      <PageHead
        eyebrow="Rumpf, Bauch, Stabilität"
        title="Bauch & Core"
        lead="Reverse Crunch, Dead Bug, Plank, Side Plank und Crunches. Sie stecken schon in deinen vier Einheiten. Hier vergleichst du Wiederholungen, Sätze und Haltezeiten."
        actions={
          <a className="btn btn-primary" href={href('/training/frei')}>
            <Plus size={16} /> Core-Einheit loggen
          </a>
        }
      />
      <div className="grid grid-auto" style={{ marginBottom: 18 }}>
        {CORE_EXERCISES.map((id, i) => {
          const e = EXERCISE_MAP[id]
          const inPlan = SESSIONS.filter((s) => s.exercises.some((x) => x.exerciseId === id))
          return (
            <Card key={id} index={i} className="hoverable">
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="card-title">{e.name}</div>
                <a href={href(`/uebungen/${id}`)} className="btn btn-ghost btn-icon sm" aria-label="Anleitung">
                  <ArrowRight size={16} />
                </a>
              </div>
              <div className="muted small" style={{ margin: '6px 0 10px' }}>
                {e.execution[0]}
              </div>
              <div className="tiny">
                <strong>Typischer Fehler:</strong> {e.mistakes[0]}
              </div>
              <div className="row-wrap" style={{ marginTop: 10 }}>
                <span className="badge">{e.measure === 'time' ? 'Haltezeit' : 'Wiederholungen'}</span>
                {inPlan.map((s) => (
                  <span key={s.id} className="badge badge-outline">
                    {s.short}
                  </span>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <Card index={6}>
        <CardHead
          eyebrow="Vergleich"
          title={ex.measure === 'time' ? 'Längste Haltezeit pro Einheit' : 'Meiste Wiederholungen pro Einheit'}
          action={<Seg value={selected} onChange={setSelected} options={CORE_EXERCISES.map((id) => ({ value: id, label: EXERCISE_MAP[id].name.replace(' (Unterarmstütz)', '').replace(' (Seitstütz)', '') }))} />}
        />
        <div className="grid grid-2">
          <div>
            {series.every((s) => !s.points.length) ? (
              <Empty>Noch keine Einträge für {ex.name}.</Empty>
            ) : (
              <LineChart series={series} unit={ex.measure === 'time' ? 's' : ''} decimals={0} />
            )}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Einheit</th>
                  <th>Sätze</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Noch keine Daten
                    </td>
                  </tr>
                )}
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{formatDate(h.date)}</td>
                    <td className="muted small">{h.title}</td>
                    <td className="num" style={{ textAlign: 'left' }}>
                      {h.sets.map((s) => `${s.side ? (s.side === 'left' ? 'L ' : 'R ') : ''}${s.seconds ? `${s.seconds} s` : `${s.reps ?? 0}×`}`).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
