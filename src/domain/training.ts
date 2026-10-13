import { ARM_BALANCE_EXERCISES, EXERCISE_MAP } from '../data/exercises'
import { phaseFor, PLAN_RULES, SESSION_MAP, SESSIONS } from '../data/plan'
import { addDays, diffDays, startOfWeek, todayISO, weekdayIndex } from '../lib/date'
import type { PlannedExercise, ScheduleChange, SessionId, Settings, SetLog, TargetWeight, WorkoutLog } from '../types'

export interface PlannedSession {
  key: string
  week: number
  sessionId: SessionId
  defaultDate: string
  date: string
  moved: boolean
  skipped: boolean
  /** Optionale 5. Einheit: verpasst zählt nicht als verpasst */
  optional: boolean
}

export type SessionStatus = 'done' | 'missed' | 'today' | 'upcoming' | 'skipped'

export function programMonday(settings: Settings): string {
  return startOfWeek(settings.program.startDate)
}

/** Programmwoche (1 … 16) für ein Datum, 0 vor dem Start. */
export function programWeek(settings: Settings, date: string): number {
  const d = diffDays(date, programMonday(settings))
  if (d < 0) return 0
  return Math.floor(d / 7) + 1
}

export function weekStart(settings: Settings, week: number): string {
  return addDays(programMonday(settings), (week - 1) * 7)
}

export interface WeekSlot {
  /** Kurzname des Tages, Teil des Schlüssels (w3-mo) */
  slot: 'mo' | 'di' | 'do' | 'fr' | 'sa' | 'so'
  offset: number
  sessionId: SessionId
  optional: boolean
}

/**
 * Wochenraster: Pull und Push im Wechsel an Mo, Di, Do, Fr. Bei 5 Einheiten kommt Tag C
 * (Arme und Calisthenics) am Samstag oder Sonntag dazu.
 */
export function weekSlots(settings: Settings, _week?: number): WeekSlot[] {
  const slots: WeekSlot[] = [
    { slot: 'mo', offset: 0, sessionId: 'pull-a', optional: false },
    { slot: 'di', offset: 1, sessionId: 'push-b', optional: false },
    { slot: 'do', offset: 3, sessionId: 'pull-a', optional: false },
    { slot: 'fr', offset: 4, sessionId: 'push-b', optional: false },
  ]
  const extra = settings.program.extraDay
  if (extra === 'sa' || extra === 'so') {
    slots.push({ slot: extra, offset: extra === 'sa' ? 5 : 6, sessionId: 'arme-c', optional: false })
  }
  return slots
}

export function plannedKey(week: number, slot: string): string {
  return `w${week}-${slot}`
}

export function plannedSessionsForWeek(settings: Settings, schedule: ScheduleChange[], week: number): PlannedSession[] {
  const monday = weekStart(settings, week)
  const changes = new Map(schedule.map((s) => [s.id, s]))
  return weekSlots(settings, week)
    .map((s) => {
      const key = plannedKey(week, s.slot)
      const defaultDate = addDays(monday, s.offset)
      const change = changes.get(key)
      return {
        key,
        week,
        sessionId: s.sessionId,
        defaultDate,
        date: change?.movedTo ?? defaultDate,
        moved: !!change?.movedTo && change.movedTo !== defaultDate,
        skipped: !!change?.skipped,
        optional: s.optional,
      }
    })
    .filter((p) => p.defaultDate >= settings.program.startDate || p.moved)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function allPlannedSessions(settings: Settings, schedule: ScheduleChange[]): PlannedSession[] {
  const out: PlannedSession[] = []
  for (let w = 1; w <= settings.program.weeks; w++) out.push(...plannedSessionsForWeek(settings, schedule, w))
  return out
}

/** Schlüssel aus dem früheren Plan (z. B. „w1-mo-a“). */
const LEGACY_KEY = /^w\d+-(mo-a|arme-a|fr-b|ok-b)$/

export function workoutForPlanned(planned: PlannedSession, workouts: WorkoutLog[]): WorkoutLog | undefined {
  return (
    workouts.find((w) => w.plannedKey === planned.key) ??
    // Trainings aus dem früheren Plan zählen für die Einheit am selben Tag
    workouts.find((w) => !!w.plannedKey && LEGACY_KEY.test(w.plannedKey) && w.date === planned.date)
  )
}

export function sessionStatus(planned: PlannedSession, workouts: WorkoutLog[], today = todayISO()): SessionStatus {
  if (workoutForPlanned(planned, workouts)) return 'done'
  if (planned.skipped) return 'skipped'
  if (planned.date === today) return 'today'
  if (planned.date < today) return planned.optional ? 'skipped' : 'missed'
  return 'upcoming'
}

export function nextSession(settings: Settings, schedule: ScheduleChange[], workouts: WorkoutLog[], today = todayISO()) {
  const all = allPlannedSessions(settings, schedule)
  return all.find((p) => {
    const st = sessionStatus(p, workouts, today)
    return st === 'today' || st === 'upcoming'
  })
}

/** Übung, die tatsächlich gemacht wird (Überzüge → Reverse Fly, wenn als ungeeignet markiert). */
export function effectiveExerciseId(planned: PlannedExercise, settings: Settings): string {
  if (planned.exerciseId === 'ueberzuege' && !settings.program.pulloverSuitable) return 'reverse-fly'
  return planned.exerciseId
}

/**
 * Satzzahl für die Woche nach Phase: Technik 2, Aufbau 3, Intensiv/Peak 3 (Schwerpunkt 4),
 * Testwoche 2. Zusatzübungen bleiben bei ihrer Satzzahl.
 */
export function setsForWeek(planned: PlannedExercise, week: number): number {
  const phase = phaseFor(week)
  if (planned.optional) return Math.min(planned.sets, phase.sets)
  if (planned.priority && phase.prioritySets > phase.sets) return Math.max(phase.prioritySets, Math.min(planned.sets, phase.sets))
  return Math.min(planned.sets, phase.sets) || phase.sets
}

export interface SetSlot {
  index: number
  side?: 'left' | 'right'
  extra?: boolean
}

/**
 * Reihenfolge der Sätze für den Logger. Bei einarmigen Übungen kommt immer zuerst
 * die schwächere Seite, die stärkere Seite folgt mit derselben Wiederholungszahl.
 */
export function setSlots(planned: PlannedExercise, settings: Settings, week: number, reduced = false): SetSlot[] {
  let sets = setsForWeek(planned, week)
  if (reduced) sets = Math.max(1, Math.min(sets, PLAN_RULES.beginnerMaxSets))
  const exId = effectiveExerciseId(planned, settings)
  const ex = EXERCISE_MAP[exId]
  if (!ex.unilateral || !planned.perSide) return Array.from({ length: sets }, (_, i) => ({ index: i }))
  const weaker = settings.arms.weakerSide ?? 'left'
  const stronger = weaker === 'left' ? 'right' : 'left'
  const slots: SetSlot[] = []
  for (let i = 0; i < sets; i++) {
    slots.push({ index: i, side: weaker })
    slots.push({ index: i, side: stronger })
  }
  // Zusatzsatz für die schwächere Seite ab der Aufbauphase (mehr Umfang links gleicht am schnellsten aus)
  if (settings.program.extraWeakSet && week >= PLAN_RULES.extraWeakSetFromWeek && phaseFor(week).id !== 'test' && ARM_BALANCE_EXERCISES.includes(exId) && !reduced) {
    slots.push({ index: sets, side: weaker, extra: true })
  }
  return slots
}

export function targetKey(exerciseId: string, side?: 'left' | 'right'): string {
  return side ? `${exerciseId}:${side}` : exerciseId
}

/** Letzte Sätze einer Übung (neuestes Training zuerst). */
export function lastExerciseLog(workouts: WorkoutLog[], exerciseId: string, beforeDate?: string) {
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  for (const w of sorted) {
    if (beforeDate && w.date >= beforeDate) continue
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.length) return { workout: w, log: ex }
  }
  return undefined
}

export interface ProgressionHint {
  id: string
  exerciseId: string
  side?: 'left' | 'right'
  kind: 'weight' | 'reps' | 'time'
  currentKg?: number
  suggestedKg?: number
  text: string
}

/**
 * Progression: Wenn alle vorgesehenen Sätze die Obergrenze sauber erreicht haben,
 * gibt es einen Vorschlag. Nichts wird automatisch geändert.
 */
export function progressionHints(workouts: WorkoutLog[], settings: Settings, targets: TargetWeight[]): ProgressionHint[] {
  const hints: ProgressionHint[] = []
  const plannedByExercise = new Map<string, PlannedExercise>()
  for (const s of SESSIONS) for (const pe of s.exercises) if (!plannedByExercise.has(effectiveExerciseId(pe, settings))) plannedByExercise.set(effectiveExerciseId(pe, settings), pe)

  for (const [exId, pe] of plannedByExercise) {
    const last = lastExerciseLog(workouts, exId)
    if (!last) continue
    const ex = EXERCISE_MAP[exId]
    const week = programWeek(settings, last.workout.date)
    const needed = setsForWeek(pe, Math.max(week, 1))
    const sides: (undefined | 'left' | 'right')[] = ex.unilateral && pe.perSide ? ['left', 'right'] : [undefined]
    for (const side of sides) {
      const sets = last.log.sets.filter((s) => !s.extra && s.side === side)
      if (sets.length < needed) continue
      const value = (s: SetLog) => (pe.unit === 'sec' ? (s.seconds ?? 0) : (s.reps ?? 0))
      const allTop = sets.slice(0, needed).every((s) => s.clean && value(s) >= pe.max)
      if (!allTop) continue
      const id = `prog-${exId}-${side ?? 'both'}-${last.workout.id}`
      const sideLabel = side ? (side === 'left' ? ' (links)' : ' (rechts)') : ''
      if (pe.unit === 'sec') {
        hints.push({ id, exerciseId: exId, side, kind: 'time', text: `${ex.name}${sideLabel}: Alle Sätze sauber ${pe.max} s gehalten. Nächstes Mal eine schwierigere Variante probieren oder 5–10 s länger halten.` })
      } else if (ex.bodyweight) {
        hints.push({ id, exerciseId: exId, side, kind: 'reps', text: `${ex.name}${sideLabel}: Obergrenze von ${pe.max} Wiederholungen in allen Sätzen erreicht. Nächstes Mal eine schwerere Variante (siehe Anleitung) oder langsamer absenken.` })
      } else {
        const current = Math.max(...sets.map((s) => s.weightKg ?? 0))
        const target = targets.find((t) => t.id === targetKey(exId, side))
        if (target && target.kg > current) continue
        const suggested = Math.round((current + settings.program.dumbbellStepKg) * 10) / 10
        hints.push({
          id,
          exerciseId: exId,
          side,
          kind: 'weight',
          currentKg: current,
          suggestedKg: suggested,
          text: `${ex.name}${sideLabel}: Alle Sätze sauber mit ${pe.max} Wiederholungen bei ${current} kg. Vorschlag: ${suggested} kg und wieder bei ${pe.min} Wiederholungen anfangen.`,
        })
      }
    }
  }
  return hints
}

/** Vorschlag zum Nachholen einer verpassten Einheit: freier Tag in dieser Woche, nie zwei Einheiten an einem Tag. */
export function makeupDay(missed: PlannedSession, weekSessions: PlannedSession[], today: string): string | undefined {
  const monday = startOfWeek(missed.defaultDate)
  const sunday = addDays(monday, 6)
  const taken = new Set(weekSessions.filter((s) => s.key !== missed.key && !s.skipped).map((s) => s.date))
  for (let d = today; d <= sunday; d = addDays(d, 1)) {
    if (taken.has(d)) continue
    // Nicht direkt neben dieselbe Einheit legen (Pull nicht neben Pull, Push nicht neben Push)
    const neighbours = weekSessions.filter((s) => s.key !== missed.key && !s.skipped && Math.abs(diffDays(s.date, d)) === 1)
    if (neighbours.some((n) => n.sessionId === missed.sessionId)) continue
    return d
  }
  return undefined
}

export function sessionTitle(id: SessionId): string {
  return SESSION_MAP[id].title
}

export function isTrainingDay(settings: Settings, date: string): boolean {
  const i = weekdayIndex(date)
  return weekSlots(settings, Math.max(1, programWeek(settings, date))).some((s) => s.offset === i)
}

export function volumeOf(sets: SetLog[]): number {
  return sets.reduce((s, x) => s + (x.weightKg ?? 0) * (x.reps ?? 0), 0)
}

/** Geschätztes 1RM (Epley), nur als Vergleichswert für den Verlauf. */
export function estimated1RM(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0
  return weightKg * (1 + reps / 30)
}

/** Dosierung für die Anzeige, z. B. „2 × 15 je Seite“ oder „2 × bis Versagen“. */
export function formatDosage(pe: PlannedExercise, week = 3): string {
  const sets = setsForWeek(pe, week)
  const unit = pe.unit === 'sec' ? ' s' : ''
  const amount = pe.toFailure ? 'bis Versagen' : pe.min === pe.max ? `${pe.max}${unit}` : `${pe.min}–${pe.max}${unit}`
  return `${sets} × ${amount}${pe.perSide || pe.repsPerSide ? ' je Seite' : ''}`
}

/** Link zu Kurzvideos auf YouTube (Suche, damit der Link nie ins Leere führt). */
export function videoSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} shorts`)}`
}
