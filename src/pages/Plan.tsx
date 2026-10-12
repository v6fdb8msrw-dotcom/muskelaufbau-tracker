import { ArrowUpRight, CheckCircle2, Dumbbell, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useProgram } from '../components/hooks'
import { Card, CardHead, PageHead } from '../components/ui'
import { EXERCISE_MAP } from '../data/exercises'
import { SESSIONS } from '../data/plan'
import { effectiveExerciseId, plannedSessionsForWeek, progressionHints, sessionStatus, setsForWeek, targetKey } from '../domain/training'
import { formatDate, relativeDay, WEEKDAY_LONG } from '../lib/date'
import { stamp } from '../lib/id'
import { href } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { SuggestionState, TargetWeight } from '../types'

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

  const sessions = SESSIONS.map((s) => {
    const offset = { 'mo-a': 0, 'arme-a': p.secondDay === 'di' ? 1 : 2, 'fr-b': 4, 'ok-b': p.weekendDay === 'sa' ? 5 : 6 }[s.id]
    const planned = thisWeek.find((x) => x.sessionId === s.id)
    return { s, offset, planned, status: planned ? sessionStatus(planned, data.workouts, today) : undefined }
  }).sort((a, b) => (a.planned?.date ?? String(a.offset)).localeCompare(b.planned?.date ?? String(b.offset)))
  const done = sessions.filter((x) => x.status === 'done').length

  return (
    <div className="page">
      <PageHead
        eyebrow={week >= 1 ? `Woche ${w} von ${p.weeks} · ${done}/${sessions.length} erledigt` : `Start am ${formatDate(p.startDate)}`}
        title="Training"
      />

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
        {sessions.map(({ s, offset, planned, status }, i) => (
          <Card key={s.id} index={i} className={`session-card ${status ?? ''}`}>
            <CardHead
              eyebrow={planned ? `${relativeDay(planned.date, today)}${status === 'done' ? ' · erledigt' : status === 'missed' ? ' · verpasst' : ''}` : WEEKDAY_LONG[offset]}
              title={s.title}
              action={
                planned &&
                (status === 'done' ? (
                  <a className="btn btn-sm" href={href(`/training/${planned.key}`)}>
                    <CheckCircle2 size={15} /> Ansehen
                  </a>
                ) : (
                  <a className={`btn btn-sm ${status === 'today' ? 'btn-primary' : ''}`} href={href(`/training/${planned.key}`)}>
                    <Dumbbell size={15} /> Starten
                  </a>
                ))
              }
            />
            <div className="exercise-list">
              {s.exercises.map((pe) => {
                const exId = effectiveExerciseId(pe, settings)
                const now = setsForWeek(pe, w)
                return (
                  <a key={pe.exerciseId} className="exercise-row" href={href(`/uebungen/${exId}`)}>
                    <span className="grow">{EXERCISE_MAP[exId].name}</span>
                    <span className="num muted">
                      {now} × {pe.min}–{pe.max}
                      {pe.unit === 'sec' ? ' s' : ''}
                      {pe.perSide || pe.repsPerSide ? ' je Seite' : ''}
                    </span>
                  </a>
                )
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
