import { ArrowUpRight, CheckCircle2, Dumbbell, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExerciseTutorial } from '../components/ExerciseTutorial'
import { useProgram } from '../components/hooks'
import { Card, CardHead, PageHead } from '../components/ui'
import { EXERCISE_MAP } from '../data/exercises'
import { PHASES, phaseFor, SESSION_MAP, SESSIONS, WEEKLY_ROWING } from '../data/plan'
import { effectiveExerciseId, formatDosage, plannedSessionsForWeek, progressionHints, sessionMinutes, sessionStatus, targetKey, type PlannedSession, type SessionStatus } from '../domain/training'
import { formatDate, relativeDay } from '../lib/date'
import { stamp } from '../lib/id'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { CardioBlock, PlannedExercise, SuggestionState, TargetWeight, TrainingSession } from '../types'

interface Item {
  planned?: PlannedSession
  session: TrainingSession
  status?: SessionStatus
}

export default function Plan() {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const { today, week } = useProgram()
  const w = Math.min(Math.max(week, 1), settings.program.weeks)
  const thisWeek = useMemo(() => plannedSessionsForWeek(settings, data.schedule, w), [settings, data.schedule, w])
  const hints = useMemo(
    () => progressionHints(data.workouts, settings, data.targetWeights).filter((h) => !data.suggestions.some((s) => s.id === h.id)),
    [data.workouts, data.targetWeights, data.suggestions, settings],
  )
  const p = settings.program

  async function acceptHint(id: string, exerciseId: string, side: 'left' | 'right' | undefined, kg?: number) {
    if (kg) {
      const tid = targetKey(exerciseId, side)
      const existing = data.targetWeights.find((t) => t.id === tid)
      await store.save('targetWeights', existing ? { ...existing, kg, updatedAt: new Date().toISOString() } : stamp<TargetWeight>({ id: tid, kg }))
    }
    await store.save('suggestions', stamp<SuggestionState>({ id, status: 'accepted' }))
    toast(kg ? `Zielgewicht ${kg} kg übernommen` : 'Gemerkt')
  }

  const [tutorial, setTutorial] = useState<{ exerciseId: string; planned?: PlannedExercise; cardio?: CardioBlock } | null>(null)
  // Einheiten dieser Woche nach Datum; vor dem Programmstart die beiden Vorlagen
  const sessions: Item[] = thisWeek.length
    ? thisWeek.map((planned) => ({ planned, session: SESSION_MAP[planned.sessionId], status: sessionStatus(planned, data.workouts, today) }))
    : SESSIONS.map((session) => ({ session }))
  const phase = phaseFor(Math.max(week, 1))
  const required = sessions.filter((x) => !x.planned?.optional)
  const done = required.filter((x) => x.status === 'done').length
  // Eine Karte pro Tag: Hanteln und Calisthenics zusammen, mit Richtzeit für den ganzen Tag
  const days: Item[][] = []
  for (const it of sessions) {
    const last = days.at(-1)
    if (it.planned && last?.[0].planned?.date === it.planned.date) last.push(it)
    else days.push([it])
  }
  const minutes = (it: Item) => sessionMinutes(it.session, settings, w, it.planned?.rowing)
  const dayStatus = (day: Item[]) =>
    day.every((x) => x.status === 'done') ? 'done' : day.some((x) => x.status === 'today') ? 'today' : day.some((x) => x.status === 'missed') ? 'missed' : ''

  const cardioRow = (c: CardioBlock, label: string) => (
    <button type="button" className="exercise-row cardio" onClick={() => setTutorial({ exerciseId: c.exerciseId, cardio: c })}>
      <span className="grow">
        <span className="row-label">{label}</span>
        {EXERCISE_MAP[c.exerciseId].name}
        {c.optional && <span className="opt-tag">optional</span>}
      </span>
      <span className="num muted">{c.min === c.max ? `${c.min} min` : `${c.min}–${c.max} min`}</span>
    </button>
  )

  return (
    <div className="page">
      <PageHead
        eyebrow={week >= 1 ? `Woche ${w} von ${p.weeks} · ${done}/${required.length} erledigt` : `Start am ${formatDate(p.startDate)}`}
        title="Training"
      />

      <Card index={0} className="phase-card" style={{ marginBottom: 18 }}>
        <div className="phase-track" aria-label="16 Wochen in Phasen">
          {PHASES.map((ph, i) => (
            <div key={ph.id} className={`phase-step ${ph.id === phase.id ? 'now' : ph.to < Math.max(week, 1) ? 'past' : ''}`} style={{ flexGrow: ph.to - ph.from + 1 }}>
              <span className="phase-bar" />
              <span className="phase-name">
                {i + 1} · {ph.name}
              </span>
              <span className="phase-weeks">{ph.from === ph.to ? `Woche ${ph.from}` : `Woche ${ph.from}–${ph.to}`}</span>
            </div>
          ))}
        </div>
        <div className="phase-now">
          <div>
            <div className="eyebrow">Jetzt: Phase {PHASES.indexOf(phase) + 1} · {phase.name}</div>
            <div className="phase-effort">
              {phase.sets === phase.prioritySets ? `${phase.sets} Sätze` : `${phase.sets} Sätze, Schwerpunkt ${phase.prioritySets}`} · {phase.effort}
            </div>
          </div>
          <ul className="phase-rules">
            {phase.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </Card>

      {hints.length > 0 && (
        <Card index={0} style={{ marginBottom: 18 }}>
          <CardHead eyebrow="Vorschlag" title="Bereit für mehr Gewicht?" action={<TrendingUp size={18} color="var(--neon-ink)" />} />
          <div className="stack">
            {hints.map((h) => (
              <div key={h.id} className="suggestion">
                <span className="icon-tile neon">
                  <ArrowUpRight size={18} />
                </span>
                <div className="grow">
                  <div className="small">{h.text}</div>
                  <div className="suggestion-actions">
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => acceptHint(h.id, h.exerciseId, h.side, h.suggestedKg)}>
                      {h.suggestedKg ? `Übernehmen (${h.suggestedKg} kg)` : 'Übernehmen'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => store.save('suggestions', stamp<SuggestionState>({ id: h.id, status: 'ignored' }))}
                    >
                      Ignorieren
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-2">
        {days.map((day, i) => {
          const first = day[0]
          return (
            <Card key={first.planned?.key ?? first.session.id} index={i} className={`session-card ${dayStatus(day)} ${first.planned?.optional ? 'optional' : ''}`}>
              <CardHead
                eyebrow={
                  first.planned
                    ? `${relativeDay(first.planned.date, today)} · ca. ${day.reduce((sum, x) => sum + minutes(x), 0)} min${first.planned.optional ? ' · freiwillig' : ''}`
                    : first.session.focus
                }
                title={first.session.title.replace(' · Calisthenics', '')}
              />
              {day.map(({ planned, session, status }) => (
                <div key={planned?.key ?? session.id} className="session-block">
                  <div className="block-head">
                    <span className="grow">
                      <span className="row-label">{session.block}</span>
                      <span className="muted small">
                        ca. {minutes({ planned, session })} min{status === 'done' ? ' · erledigt' : status === 'missed' ? ' · verpasst' : ''}
                      </span>
                    </span>
                    {planned &&
                      (status === 'done' ? (
                        <a className="btn btn-sm" href={href(`/training/${planned.key}`)}>
                          <CheckCircle2 size={15} /> Ansehen
                        </a>
                      ) : (
                        <a className={`btn btn-sm ${status === 'today' ? 'btn-primary' : ''}`} href={href(`/training/${planned.key}`)}>
                          <Dumbbell size={15} /> Starten
                        </a>
                      ))}
                  </div>
                  <div className="exercise-list">
                    {session.warmup && cardioRow(session.warmup, 'Einstieg')}
                    {session.warmupText && (
                      <div className="exercise-row warmup">
                        <span className="grow">
                          <span className="row-label">Aufwärmen</span>
                          {session.warmupText}
                        </span>
                      </div>
                    )}
                    {session.exercises.map((pe) => {
                      const exId = effectiveExerciseId(pe, settings)
                      return (
                        <button key={pe.exerciseId} type="button" className={`exercise-row ${pe.optional ? 'is-optional' : ''}`} onClick={() => setTutorial({ exerciseId: exId, planned: pe })}>
                          <span className="grow">
                            {EXERCISE_MAP[exId].name}
                            {pe.optional && <span className="opt-tag">optional</span>}
                            {EXERCISE_MAP[exId].unilateral && pe.perSide && <span className="opt-tag side">links zuerst</span>}
                          </span>
                          <span className="num muted">{formatDosage(pe, w)}</span>
                        </button>
                      )
                    })}
                    {planned?.rowing && cardioRow(WEEKLY_ROWING, 'Danach')}
                    {session.finisher && cardioRow(session.finisher, 'Abschluss')}
                  </div>
                </div>
              ))}
            </Card>
          )
        })}
      </div>

      <div className="muted tiny" style={{ marginTop: 14 }}>
        Richtzeiten mit Pausen, ohne optionale Übungen. Den Calisthenics-Block machst du 1–2 Stunden nach den Hanteln. Tipp auf eine Übung zeigt das Mini-Tutorial mit Bewegungsablauf, Kurzvideos und der passenden Gym-Übung.
      </div>

      {tutorial && <ExerciseTutorial exerciseId={tutorial.exerciseId} planned={tutorial.planned} cardio={tutorial.cardio} onClose={() => setTutorial(null)} />}
    </div>
  )
}
