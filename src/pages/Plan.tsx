import { ArrowUpRight, CalendarDays, CheckCircle2, Dumbbell, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useProgram } from '../components/hooks'
import { Card, CardHead, Notice, PageHead, Seg, Switch } from '../components/ui'
import { EXERCISE_MAP } from '../data/exercises'
import { PLAN_RULES, SESSIONS } from '../data/plan'
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

  return (
    <div className="page">
      <PageHead
        eyebrow={week >= 1 ? `Woche ${w} von ${p.weeks}` : `Start am ${formatDate(p.startDate)}`}
        title="Trainingsplan"
        lead="Vier Einheiten pro Woche für Brust, Rücken, Arme und Bauch. Alles geht mit Kurzhanteln und ohne Klimmzugstange."
        actions={
          <a className="btn" href={href('/kalender')}>
            <CalendarDays size={16} /> Kalender
          </a>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Card index={0} className="span-2" marble>
          <CardHead eyebrow="Diese Woche" title="Deine Einheiten" />
          <div className="list">
            {thisWeek.map((s) => {
              const st = sessionStatus(s, data.workouts, today)
              const session = SESSIONS.find((x) => x.id === s.sessionId)!
              return (
                <div key={s.key} className="list-item">
                  <span className={`icon-tile ${st === 'done' ? 'neon' : st === 'today' ? 'dark' : ''}`}>{st === 'done' ? <CheckCircle2 size={18} /> : <Dumbbell size={18} />}</span>
                  <div className="grow">
                    <div className="title">{session.title}</div>
                    <div className="meta">
                      {relativeDay(s.date, today)}
                      {s.moved ? ' · verschoben' : ''}
                      {st === 'missed' ? ' · verpasst' : ''}
                    </div>
                  </div>
                  <a className={`btn btn-sm ${st === 'today' ? 'btn-primary' : ''}`} href={href(`/training/${s.key}`)}>
                    {st === 'done' ? 'Ansehen' : st === 'today' ? 'Starten' : 'Öffnen'}
                  </a>
                </div>
              )
            })}
            {thisWeek.length === 0 && <div className="muted small">Diese Woche liegt vor dem Programmstart.</div>}
          </div>
        </Card>

        <Card index={1}>
          <CardHead eyebrow="Wochentage" title="Wann trainierst du?" />
          <div className="stack">
            <div className="small">
              <strong>Montag</strong> und <strong>Freitag</strong> sind fest.
            </div>
            <div className="stack-sm">
              <span className="field-label">Zusätzlicher Wochentag</span>
              <Seg value={p.secondDay} onChange={(v) => store.updateSettings((s) => ({ ...s, program: { ...s.program, secondDay: v } }))} options={[{ value: 'di', label: 'Dienstag' }, { value: 'mi', label: 'Mittwoch' }]} />
            </div>
            <div className="stack-sm">
              <span className="field-label">Wochenendtag</span>
              <Seg value={p.weekendDay} onChange={(v) => store.updateSettings((s) => ({ ...s, program: { ...s.program, weekendDay: v } }))} options={[{ value: 'sa', label: 'Samstag' }, { value: 'so', label: 'Sonntag' }]} />
            </div>
            <Switch
              checked={p.pulloverSuitable}
              onChange={(v) => store.updateSettings((s) => ({ ...s, program: { ...s.program, pulloverSuitable: v } }))}
              label="Kurzhantel-Überzüge fühlen sich sicher an"
            />
            {!p.pulloverSuitable && <div className="muted tiny">Statt Überzügen planst du „Vorgebeugtes Reverse Fly“.</div>}
          </div>
        </Card>
      </div>

      <Card index={2} style={{ marginBottom: 18 }}>
        <CardHead eyebrow="Regeln" title="So steigerst du dich" />
        <div className="grid grid-2">
          <ul className="bullets">
            <li>
              <strong>Woche 1–2:</strong> höchstens {PLAN_RULES.beginnerMaxSets} Arbeitssätze pro Übung, Technik lernen.
            </li>
            <li>
              <strong>Ab Woche 3:</strong> bei guter Erholung schrittweise auf die vorgesehenen Sätze. Bei mittlerer oder schlechter Erholung bei 2 Sätzen bleiben.
            </li>
            <li>{PLAN_RULES.reserveText}</li>
            <li>
              <strong>Progression:</strong> Erreichst du in allen Sätzen sauber die obere Wiederholungszahl, schlägt die App die nächste Gewichtsstufe vor (+{p.dumbbellStepKg} kg). Nichts ändert sich automatisch.
            </li>
          </ul>
          <ul className="bullets">
            <li>
              <strong>Einarmige Übungen:</strong> immer mit der schwächeren Seite beginnen. Die stärkere Seite macht dieselbe Zahl sauberer Wiederholungen, nicht mehr.
            </li>
            <li>
              <strong>Sonntag/Samstag:</strong> „Oberkörper B“ ist flexibel. Bei schlechter Erholung darfst du sie mit weniger Volumen machen.
            </li>
            <li>
              <strong>Ausdauer:</strong> Rudergerät oder Laufband nur kurz zum Aufwärmen (5 Minuten), damit genug Energie für den Muskelaufbau bleibt.
            </li>
            <li>
              <strong>Klimmzugstange</strong> ist nicht nötig. Wenn du später eine kaufst, stehen Varianten in den Übungsanleitungen.
            </li>
          </ul>
        </div>
      </Card>

      {hints.length > 0 && (
        <Card index={3} style={{ marginBottom: 18 }}>
          <CardHead eyebrow="Vorschläge" title="Bereit für mehr?" action={<TrendingUp size={18} color="var(--neon-ink)" />} />
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
        {SESSIONS.map((s, i) => {
          const planned = thisWeek.find((x) => x.sessionId === s.id)
          const offset = { 'mo-a': 0, 'arme-a': p.secondDay === 'di' ? 1 : 2, 'fr-b': 4, 'ok-b': p.weekendDay === 'sa' ? 5 : 6 }[s.id]
          return (
            <Card key={s.id} index={i + 4}>
              <CardHead
                eyebrow={WEEKDAY_LONG[offset]}
                title={s.title}
                action={
                  planned && (
                    <a className="btn btn-sm" href={href(`/training/${planned.key}`)}>
                      Loggen
                    </a>
                  )
                }
              />
              <p className="muted small" style={{ marginBottom: 12 }}>
                {s.focus}
              </p>
              <div className="table-wrap">
                <table className="table session-table">
                  <thead>
                    <tr>
                      <th>Übung</th>
                      <th className="num">Sätze</th>
                      <th className="num">Wdh./Zeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.exercises.map((pe) => {
                      const exId = effectiveExerciseId(pe, settings)
                      const now = setsForWeek(pe, w)
                      return (
                        <tr key={pe.exerciseId}>
                          <td>
                            <a href={href(`/uebungen/${exId}`)} style={{ textDecoration: 'none' }}>
                              {EXERCISE_MAP[exId].name}
                            </a>
                            {exId !== pe.exerciseId && <div className="muted tiny">Alternative zu Überzügen</div>}
                          </td>
                          <td className="num">
                            {now}
                            {now !== pe.sets && <span className="muted"> (später {pe.sets})</span>}
                            {pe.perSide && <span className="muted"> je Seite</span>}
                          </td>
                          <td className="num">
                            {pe.min}–{pe.max}
                            {pe.unit === 'sec' ? ' s' : ''}
                            {pe.repsPerSide && <span className="muted"> je Seite</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
      </div>

      {!settings.arms.weakerSide && (
        <div style={{ marginTop: 18 }}>
          <Notice>
            Du hast noch nicht festgelegt, welcher Arm schwächer ist. <a href={href('/einstellungen?tab=training')}>In den Einstellungen festlegen</a>
          </Notice>
        </div>
      )}
    </div>
  )
}
