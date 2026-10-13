import { ArrowLeft, Check, Info, PlayCircle, Timer, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { ExerciseTutorial } from '../components/ExerciseTutorial'
import { useToday } from '../components/hooks'
import { SIDE_LABEL } from '../components/labels'
import { Card, Field, NumberInput, PageHead, Seg, Switch } from '../components/ui'
import { CORE_EXERCISES, EXERCISE_MAP, EXERCISES } from '../data/exercises'
import { PHASES, phaseFor, PLAN_RULES, SESSION_MAP, SESSIONS } from '../data/plan'
import { effectiveExerciseId, formatDosage, lastExerciseLog, plannedSessionsForWeek, programWeek, setSlots, targetKey } from '../domain/training'
import { formatDateLong } from '../lib/date'
import { stamp } from '../lib/id'
import { num } from '../lib/format'
import { readLocal, removeLocal, writeLocal } from '../storage/localPrefs'
import { href, navigate, type Route } from '../state/router'
import { useStore } from '../state/store'
import { useToast } from '../state/toast'
import type { PlannedExercise, SessionId, SetLog, WorkoutLog } from '../types'

type Template = SessionId | 'core' | 'eigene'

interface Draft {
  date: string
  template: Template
  custom: string[]
  sets: Record<string, SetLog[]>
  recovery?: 1 | 2 | 3
  reduced: boolean
  durationMin?: number
  notes: string
  rower?: number
  treadmill?: number
}

function templateExercises(template: Template, custom: string[]): PlannedExercise[] {
  if (template === 'core') {
    return CORE_EXERCISES.map((id) => {
      const ex = EXERCISE_MAP[id]
      return ex.measure === 'time'
        ? { exerciseId: id, sets: 2, min: 20, max: 45, unit: 'sec' as const, perSide: ex.unilateral }
        : { exerciseId: id, sets: 2, min: 10, max: 20, unit: 'reps' as const, repsPerSide: id === 'dead-bug' }
    })
  }
  if (template === 'eigene') {
    return custom.map((id) => {
      const ex = EXERCISE_MAP[id]
      return { exerciseId: id, sets: 3, min: ex.measure === 'time' ? 20 : 8, max: ex.measure === 'time' ? 45 : 15, unit: ex.measure === 'time' ? ('sec' as const) : ('reps' as const), perSide: ex.unilateral }
    })
  }
  return SESSION_MAP[template].exercises
}

export default function WorkoutLogger({ route }: { route: Route }) {
  const store = useStore()
  const { data, settings } = store
  const { toast } = useToast()
  const today = useToday()
  const key = route.segments[1] ?? 'frei'

  const context = useMemo(() => {
    const m = key.match(/^w(\d+)-([a-z-]+)$/)
    if (m) {
      const week = Number(m[1])
      const planned = plannedSessionsForWeek(settings, data.schedule, week).find((p) => p.key === key)
      const existing = data.workouts.find((w) => w.plannedKey === key)
      const sessionId = planned?.sessionId ?? existing?.sessionId
      if (planned || existing) return { kind: 'planned' as const, week, sessionId, planned, existing }
    }
    if (key.startsWith('log-')) {
      const existing = data.workouts.find((w) => w.id === key.slice(4))
      return { kind: 'existing' as const, existing, sessionId: existing?.sessionId }
    }
    return { kind: 'free' as const, existing: undefined, sessionId: undefined }
  }, [key, settings, data.schedule, data.workouts])

  const draftKey = `ms.draft.workout.${key}`
  // Die Komponente wird pro Einheit neu angelegt (key in App.tsx), deshalb reicht ein einmaliger Startwert
  const [draft, setDraft] = useState<Draft>(() => {
    const ex = context.existing
    if (ex) {
      const sets: Record<string, SetLog[]> = {}
      for (const e of ex.exercises) sets[e.exerciseId] = e.sets
      return {
        date: ex.date,
        template: ex.sessionId ?? 'eigene',
        custom: ex.sessionId ? [] : ex.exercises.map((e) => e.exerciseId),
        sets,
        recovery: ex.recovery,
        reduced: false,
        durationMin: ex.durationMin,
        notes: ex.notes ?? '',
        rower: ex.cardio?.find((c) => c.kind === 'rudern')?.minutes,
        treadmill: ex.cardio?.find((c) => c.kind === 'laufband')?.minutes,
      }
    }
    const fallback: Draft = {
      date: context.kind === 'planned' ? (context.planned?.date ?? today) : (route.query.get('datum') ?? today),
      template: context.sessionId ?? 'core',
      custom: [],
      sets: {},
      reduced: false,
      notes: '',
    }
    return readLocal<Draft>(draftKey, fallback)
  })
  const [restEnd, setRestEnd] = useState<number>()
  const [tutorial, setTutorial] = useState<{ exerciseId: string; planned?: PlannedExercise } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Entwurf lokal sichern, damit beim Schließen nichts verloren geht
  useEffect(() => {
    if (!context.existing) writeLocal(draftKey, draft)
  }, [draft, draftKey, context.existing])
  useEffect(() => {
    if (!restEnd) return
    const id = window.setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= restEnd) {
        setRestEnd(undefined)
        if ('vibrate' in navigator) navigator.vibrate?.(200)
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [restEnd])

  const week = Math.max(1, context.kind === 'planned' ? context.week : programWeek(settings, draft.date))
  const exercises = templateExercises(draft.template, draft.custom)
  const weakerChosen = settings.arms.weakerSide
  // Ohne Festlegung beginnt die App mit links (wie in setSlots)
  const weaker = weakerChosen ?? 'left'
  const title = draft.template === 'core' ? 'Bauch & Core' : draft.template === 'eigene' ? 'Eigenes Training' : SESSION_MAP[draft.template].title

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const setSet = (exId: string, index: number, patch: Partial<SetLog>, slotsLen: number, base: SetLog) => {
    setDraft((d) => {
      const list = [...(d.sets[exId] ?? [])]
      while (list.length < slotsLen) list.push({ clean: true })
      list[index] = { ...base, ...list[index], ...patch }
      return { ...d, sets: { ...d.sets, [exId]: list } }
    })
  }

  async function save() {
    const logs = exercises
      .map((pe) => {
        const exId = effectiveExerciseId(pe, settings)
        const slots = setSlots(pe, settings, week, draft.reduced)
        const raw = draft.sets[exId] ?? []
        const sets = slots
          .map((slot, i) => {
            let s: SetLog = { ...raw[i], clean: raw[i]?.clean ?? true }
            // Stärkere Seite: gleiche Wiederholungszahl wie die schwächere, falls nichts eingetragen
            if (slot.side && slot.side !== weaker && s.reps === undefined && s.seconds === undefined) {
              const w = raw[slots.findIndex((x) => x.index === slot.index && x.side === weaker)]
              if (w && (w.reps || w.seconds)) {
                const prevWeight = lastExerciseLog(data.workouts, exId, draft.date)?.log.sets.find((x) => x.side === slot.side)?.weightKg
                const tw = data.targetWeights.find((t) => t.id === targetKey(exId, slot.side))?.kg
                s = { ...s, reps: w.reps, seconds: w.seconds, weightKg: s.weightKg ?? tw ?? prevWeight ?? w.weightKg }
              }
            }
            return { ...s, side: slot.side, extra: slot.extra }
          })
          .filter((s) => (s.reps ?? 0) > 0 || (s.seconds ?? 0) > 0)
        return { exerciseId: exId, sets }
      })
      .filter((e) => e.sets.length > 0)
    if (!logs.length) {
      toast('Bitte mindestens einen Satz eintragen', 'error')
      return
    }
    const cardio = [
      ...(draft.rower ? [{ kind: 'rudern' as const, minutes: draft.rower }] : []),
      ...(draft.treadmill ? [{ kind: 'laufband' as const, minutes: draft.treadmill }] : []),
    ]
    const base = {
      date: draft.date,
      sessionId: draft.template === 'core' || draft.template === 'eigene' ? undefined : draft.template,
      plannedKey: context.kind === 'planned' ? key : context.existing?.plannedKey,
      title,
      exercises: logs,
      durationMin: draft.durationMin,
      recovery: draft.recovery,
      cardio: cardio.length ? cardio : undefined,
      notes: draft.notes.trim() || undefined,
    }
    const record: WorkoutLog = context.existing ? { ...context.existing, ...base, updatedAt: new Date().toISOString() } : stamp<WorkoutLog>(base as WorkoutLog)
    await store.save('workouts', record)
    removeLocal(draftKey)
    toast('Training gespeichert')
    navigate(`/protokoll${draft.date === today ? '' : `?datum=${draft.date}`}`)
  }

  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0

  return (
    <div className="page">
      <a href={href('/plan')} className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}>
        <ArrowLeft size={15} /> Zurück
      </a>
      <PageHead
        eyebrow={`${context.kind === 'planned' ? `Woche ${week}` : 'Training protokollieren'}${context.existing ? ' · bereits erfasst' : ''}`}
        title={title}
        lead={`${formatDateLong(draft.date)}. ${PLAN_RULES.reserveText}`}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setRestEnd(Date.now() + 90_000)}>
              <Timer size={16} /> {restLeft ? `${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, '0')}` : 'Pause 90 s'}
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              <Check size={16} /> Speichern
            </button>
          </>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Card index={0} className="span-2">
          <div className="form-grid">
            <Field label="Datum">
              <input className="input" type="date" value={draft.date} onChange={(e) => update({ date: e.target.value })} />
            </Field>
            {context.kind !== 'planned' && (
              <Field label="Vorlage">
                <select className="select" value={draft.template} onChange={(e) => update({ template: e.target.value as Template })}>
                  {SESSIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                  <option value="core">Bauch & Core</option>
                  <option value="eigene">Eigene Auswahl</option>
                </select>
              </Field>
            )}
            <Field label="Dauer">
              <NumberInput value={draft.durationMin} onChange={(v) => update({ durationMin: v })} suffix="min" />
            </Field>
          </div>
          {draft.template === 'eigene' && (
            <div className="row-wrap" style={{ marginTop: 12 }}>
              {EXERCISES.filter((e) => e.group !== 'ausdauer').map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="chip"
                  aria-pressed={draft.custom.includes(e.id)}
                  onClick={() => update({ custom: draft.custom.includes(e.id) ? draft.custom.filter((x) => x !== e.id) : [...draft.custom, e.id] })}
                >
                  {e.name}
                </button>
              ))}
            </div>
          )}
        </Card>
        <Card index={1}>
          <div className="stack">
            <div className="field-label">Wie gut bist du erholt?</div>
            <Seg
              value={String(draft.recovery ?? '') as '' | '1' | '2' | '3'}
              onChange={(v) => update({ recovery: v ? (Number(v) as 1 | 2 | 3) : undefined })}
              options={[
                { value: '3', label: 'Gut' },
                { value: '2', label: 'Mittel' },
                { value: '1', label: 'Schlecht' },
              ]}
            />
            <Switch checked={draft.reduced} onChange={(v) => update({ reduced: v })} label="Reduziertes Volumen (höchstens 2 Sätze)" />
            {draft.recovery === 1 && !draft.reduced && (
              <div className="small warn-text row" style={{ gap: 6 }}>
                <TriangleAlert size={15} /> Bei schlechter Erholung lieber reduzieren{SESSION_MAP[draft.template as SessionId]?.flexible ? ', diese Einheit ist dafür gedacht.' : '.'}
              </div>
            )}
            <div className="muted tiny">
              Phase {PHASES.indexOf(phaseFor(week)) + 1} · {phaseFor(week).name}: {phaseFor(week).effort}.
            </div>
          </div>
        </Card>
      </div>

      {!weakerChosen && exercises.some((e) => EXERCISE_MAP[effectiveExerciseId(e, settings)].unilateral) && (
        <div className="notice" style={{ marginBottom: 18 }}>
          <Info size={17} />
          <div>
            Noch keine schwächere Seite festgelegt. Bis dahin beginnt die App mit links. <a href={href('/einstellungen?tab=training')}>Jetzt festlegen</a>
          </div>
        </div>
      )}

      <div className="stack-lg">
        {exercises.map((pe, i) => {
          const exId = effectiveExerciseId(pe, settings)
          const ex = EXERCISE_MAP[exId]
          const slots = setSlots(pe, settings, week, draft.reduced)
          const last = lastExerciseLog(data.workouts, exId, draft.date)
          const list = draft.sets[exId] ?? []
          const unit = pe.unit === 'sec' ? 's' : 'Wdh.'
          return (
            <Card key={exId + i} index={i}>
              <div className="row-between" style={{ marginBottom: 10, alignItems: 'flex-start' }}>
                <div>
                  <button type="button" className="card-title tut-link" onClick={() => setTutorial({ exerciseId: exId, planned: pe })}>
                    {ex.name}
                    <PlayCircle size={16} />
                  </button>
                  <div className="muted small">
                    {formatDosage(pe, week)}
                    {draft.reduced ? ' (reduziert)' : ''}
                    {pe.optional ? ' · optional' : ''}
                    {exId !== pe.exerciseId ? ' · Alternative zu Überzügen' : ''}
                  </div>
                  {pe.note && <div className="muted tiny">{pe.note}</div>}
                </div>
                {last && (
                  <div className="muted tiny" style={{ textAlign: 'right' }}>
                    Zuletzt ({last.workout.date.slice(8, 10)}.{last.workout.date.slice(5, 7)}.):
                    <br />
                    {last.log.sets
                      .slice(0, 4)
                      .map((s) => `${s.side ? (s.side === 'left' ? 'L ' : 'R ') : ''}${s.weightKg ? `${num(s.weightKg, 1)} kg × ` : ''}${s.reps ?? s.seconds ?? 0}${s.seconds ? ' s' : ''}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
              {slots.map((slot, idx) => {
                const target = data.targetWeights.find((t) => t.id === targetKey(exId, slot.side))
                const prev = last?.log.sets.find((s) => s.side === slot.side && !s.extra)
                const base: SetLog = { clean: true, weightKg: target?.kg ?? prev?.weightKg }
                const value: SetLog = { ...base, ...list[idx] }
                const weakIdx = slot.side && slot.side !== weaker ? slots.findIndex((s) => s.index === slot.index && s.side === weaker) : -1
                const weakReps = weakIdx >= 0 ? list[weakIdx]?.reps : undefined
                const strongerTooMany = weakReps !== undefined && (value.reps ?? 0) > weakReps
                return (
                  <div key={idx} className="set-row">
                    <div className="set-label">
                      {slot.extra ? 'Zusatz' : `Satz ${slot.index + 1}`}
                      {slot.side && (
                        <small className={slot.side === weaker && weakerChosen ? 'side-weak' : ''}>
                          {SIDE_LABEL[slot.side]}
                          {slot.side === weaker && weakerChosen ? ' · schwächer' : ''}
                        </small>
                      )}
                    </div>
                    {ex.bodyweight ? (
                      <div className="muted tiny">Körpergewicht</div>
                    ) : (
                      <NumberInput value={value.weightKg} onChange={(v) => setSet(exId, idx, { weightKg: v }, slots.length, base)} suffix="kg" step={0.5} ariaLabel="Gewicht" />
                    )}
                    <div>
                      <NumberInput
                        value={pe.unit === 'sec' ? value.seconds : value.reps}
                        onChange={(v) => setSet(exId, idx, pe.unit === 'sec' ? { seconds: v } : { reps: v }, slots.length, base)}
                        suffix={unit}
                        placeholder={weakReps !== undefined ? String(weakReps) : `${pe.min}–${pe.max}`}
                        ariaLabel={pe.unit === 'sec' ? 'Sekunden' : 'Wiederholungen'}
                      />
                      {strongerTooMany && <div className="tiny warn-text">Gleiche Anzahl wie die schwächere Seite ({weakReps})</div>}
                    </div>
                    <button
                      type="button"
                      className="clean-toggle"
                      aria-pressed={value.clean}
                      onClick={() => setSet(exId, idx, { clean: !value.clean }, slots.length, base)}
                      title={value.clean ? 'Technisch sauber' : 'Nicht ganz sauber'}
                      aria-label="Technisch sauber"
                    >
                      <Check size={17} />
                    </button>
                  </div>
                )
              })}
              {target(exId, data.targetWeights) && (
                <div className="muted tiny" style={{ marginTop: 6 }}>
                  Zielgewicht aus übernommenem Vorschlag: {target(exId, data.targetWeights)}
                </div>
              )}
            </Card>
          )
        })}

        <Card>
          <div className="card-title" style={{ marginBottom: 12 }}>
            Ausdauer & Notizen
          </div>
          <div className="form-grid">
            {settings.program.equipment.rower && (
              <Field label={context.planned?.rowing ? 'Rudergerät (diese Woche 15 min)' : 'Rudergerät'}>
                <NumberInput value={draft.rower} onChange={(v) => update({ rower: v })} suffix="min" />
              </Field>
            )}
            {settings.program.equipment.treadmill && (
              <Field label="Walking-Pad (Farmer’s Walk)">
                <NumberInput value={draft.treadmill} onChange={(v) => update({ treadmill: v })} suffix="min" />
              </Field>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notizen">
              <textarea className="textarea" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Wie lief es? Schmerzen, Technik, Schlaf …" />
            </Field>
          </div>
        </Card>

        <div className="row-between">
          {context.existing ? (
            <ConfirmButton
              className="btn btn-danger"
              confirmLabel="Training wirklich löschen?"
              onConfirm={async () => {
                await store.remove('workouts', context.existing!.id)
                toast('Training gelöscht')
                navigate('/plan')
              }}
            >
              Training löschen
            </ConfirmButton>
          ) : (
            <span className="muted tiny">Der Entwurf wird automatisch auf diesem Gerät zwischengespeichert.</span>
          )}
          <button type="button" className="btn btn-primary btn-lg" onClick={save}>
            <Check size={18} /> Training speichern
          </button>
        </div>
      </div>
      {tutorial && <ExerciseTutorial exerciseId={tutorial.exerciseId} planned={tutorial.planned} onClose={() => setTutorial(null)} />}
    </div>
  )
}

function target(exId: string, targets: { id: string; kg: number }[]): string | undefined {
  const list = targets.filter((t) => t.id === exId || t.id.startsWith(`${exId}:`))
  if (!list.length) return undefined
  return list.map((t) => `${t.id.includes(':left') ? 'links ' : t.id.includes(':right') ? 'rechts ' : ''}${num(t.kg, 1)} kg`).join(', ')
}
