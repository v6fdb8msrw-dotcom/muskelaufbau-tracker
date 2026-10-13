import type { SessionId, TrainingSession } from '../types'

/**
 * Der Trainingsplan: 100 % Oberkörper für einen Einsteiger mit großem Seitenunterschied.
 * Pull und Push im Wechsel (jeder Muskel 2× pro Woche), dazu optional Tag C für Arme und
 * Calisthenics. Der Umfang steigt über 16 Wochen in Phasen (siehe PHASES): Technik zuerst,
 * dann mehr Sätze und Sätze näher am Muskelversagen. Einarmig immer links zuerst.
 * Keine Beinübungen, keine Klimmzugstange.
 */
export const SESSIONS: TrainingSession[] = [
  {
    id: 'pull-a',
    title: 'Tag A · Pull',
    short: 'Pull',
    focus: 'Rücken und Bizeps, dazu unterer Bauch.',
    warmup: { exerciseId: 'rudergeraet', min: 10, max: 15, note: 'Locker, als Einstieg für den Rücken' },
    exercises: [
      { exerciseId: 'rudern', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true, note: 'Hauptübung Rücken' },
      { exerciseId: 'kh-rudern-vorgebeugt', sets: 3, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'reverse-fly', sets: 3, min: 12, max: 20, unit: 'reps', note: 'Leichte Hanteln, Haltung' },
      { exerciseId: 'bizepscurl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true, note: 'Ohne Schwung' },
      { exerciseId: 'hammer-curl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', note: 'Für Armdicke und Unterarm' },
      { exerciseId: 'reverse-crunch', sets: 3, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'tischrudern', sets: 2, min: 6, max: 15, unit: 'reps', optional: true, note: 'Nur an einem sehr stabilen Tisch' },
      { exerciseId: 'kh-swing', sets: 2, min: 15, max: 15, unit: 'reps', optional: true, note: 'Kettlebell-Ersatz' },
    ],
    finisher: { exerciseId: 'farmers-walk', min: 10, max: 15, optional: true, note: 'Walking-Pad 2–4 km/h, leichte Hanteln' },
  },
  {
    id: 'push-b',
    title: 'Tag B · Push',
    short: 'Push',
    focus: 'Brust, Schultern und Trizeps, dazu Rumpf.',
    exercises: [
      { exerciseId: 'liegestuetze', sets: 3, min: 8, max: 20, unit: 'reps', priority: true, note: 'Deine Stufe, siehe Anleitung' },
      { exerciseId: 'floor-press', sets: 3, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'schulterdruecken', sets: 3, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'seitheben', sets: 3, min: 12, max: 20, unit: 'reps', note: 'Für breitere Schultern' },
      { exerciseId: 'trizeps-ueberkopf', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'plank', sets: 3, min: 20, max: 120, unit: 'sec', toFailure: true, note: 'Bis zum Muskelversagen' },
      { exerciseId: 'boden-flys', sets: 2, min: 12, max: 15, unit: 'reps', optional: true },
    ],
    finisher: { exerciseId: 'farmers-walk', min: 10, max: 15, optional: true, note: 'Walking-Pad 2–4 km/h, leichte Hanteln' },
  },
  {
    id: 'arme-c',
    title: 'Tag C · Arme & Calisthenics',
    short: 'Arme',
    focus: 'Extra-Einheit für Bizeps und Trizeps mit Körpergewicht-Übungen. Optional, wenn du dich erholt fühlst.',
    exercises: [
      { exerciseId: 'diamant-liegestuetze', sets: 3, min: 6, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'stuhl-dips', sets: 3, min: 8, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'konzentrationscurl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'trizeps-kickback', sets: 3, perSide: true, min: 12, max: 15, unit: 'reps' },
      { exerciseId: 'hollow-body', sets: 3, min: 15, max: 45, unit: 'sec', toFailure: true },
      { exerciseId: 'russian-twist', sets: 2, min: 15, max: 15, unit: 'reps', repsPerSide: true, note: 'Mit Kurzhantel' },
      { exerciseId: 'kh-halo', sets: 2, min: 10, max: 10, unit: 'reps', optional: true, note: 'Kettlebell-Ersatz, je Richtung' },
    ],
    finisher: { exerciseId: 'farmers-walk', min: 10, max: 15, optional: true, note: 'Walking-Pad 2–4 km/h, leichte Hanteln' },
  },
]

export interface Phase {
  id: 'technik' | 'aufbau' | 'intensiv' | 'peak' | 'test'
  name: string
  from: number
  to: number
  /** Sätze je Übung (Schwerpunkt-Übungen bekommen in Phase 3 und 4 einen mehr) */
  sets: number
  prioritySets: number
  /** Wie nah am Muskelversagen, in Worten */
  effort: string
  rules: string[]
}

/** 16 Wochen in fünf Phasen: erst Technik, dann schrittweise mehr Umfang und Intensität. */
export const PHASES: Phase[] = [
  {
    id: 'technik',
    name: 'Technik & Basis',
    from: 1,
    to: 3,
    sets: 2,
    prioritySets: 2,
    effort: '2–3 Wiederholungen wären noch gegangen',
    rules: [
      'Leichtes Gewicht, saubere Technik vor allem anderen. Jede Übung erst im Mini-Tutorial ansehen.',
      'Tempo: 3 Sekunden absenken, kurz halten, kontrolliert hoch.',
      'Gewicht für jede Übung finden, mit dem du die obere Wiederholungszahl gerade so sauber schaffst.',
    ],
  },
  {
    id: 'aufbau',
    name: 'Aufbau',
    from: 4,
    to: 8,
    sets: 3,
    prioritySets: 3,
    effort: '1–2 Wiederholungen wären noch gegangen',
    rules: [
      'Jetzt 3 Sätze. Schaffst du in allen Sätzen die obere Zahl sauber, nächstes Mal mehr Gewicht (oder schwerere Stufe).',
      'Ab jetzt ein Zusatzsatz nur für den linken Arm bei den einarmigen Armübungen.',
      'Pausen: 60–90 Sekunden bei Armübungen, bis 2 Minuten bei Rudern und Drücken.',
    ],
  },
  {
    id: 'intensiv',
    name: 'Intensiv',
    from: 9,
    to: 12,
    sets: 3,
    prioritySets: 4,
    effort: 'Letzter Satz bis knapp ans Versagen',
    rules: [
      'Schwerpunkt-Übungen (Arme, Rücken, Brust) bekommen einen 4. Satz.',
      'Im letzten Satz so viele saubere Wiederholungen wie möglich.',
      'Liegestütze eine Stufe schwerer, sobald 3 × 20 klappen.',
    ],
  },
  {
    id: 'peak',
    name: 'Peak',
    from: 13,
    to: 15,
    sets: 3,
    prioritySets: 4,
    effort: 'Letzter Satz bis zum Versagen',
    rules: [
      'Wie Phase 3, dazu im letzten Satz 4 Sekunden absenken.',
      'Bei Liegestützen und Dips: nach dem Versagen eine leichtere Variante weiter (z. B. eng → normal → Knie).',
      'Auf Schlaf und Protein achten, jetzt wächst am meisten.',
    ],
  },
  {
    id: 'test',
    name: 'Test & Entlastung',
    from: 16,
    to: 16,
    sets: 2,
    prioritySets: 2,
    effort: 'Locker, 3 Wiederholungen Reserve',
    rules: [
      'Nur 2 lockere Sätze, der Körper erholt sich.',
      'Test: maximale Liegestütze, maximale Dips, Plank-Zeit. Arme links und rechts messen, Fotos machen.',
      'Danach mit neuem Block weitermachen oder ins Gym wechseln.',
    ],
  },
]

export function phaseFor(week: number): Phase {
  return PHASES.find((p) => week >= p.from && week <= p.to) ?? (week < 1 ? PHASES[0] : PHASES[PHASES.length - 1])
}

/** Frühere Einheiten (bis Oktober 2026). Nur noch für bereits gespeicherte Trainings. */
export const LEGACY_SESSIONS: TrainingSession[] = [
  {
    id: 'mo-a',
    title: 'Brust, Rücken und Bauch A',
    short: 'Brust/Rücken A',
    focus: 'Drücken und Ziehen für den Oberkörper, dazu unterer Bauch und Rumpfstabilität.',
    exercises: [
      { exerciseId: 'floor-press', sets: 3, min: 8, max: 12, unit: 'reps' },
      { exerciseId: 'rudern', sets: 3, perSide: true, min: 8, max: 15, unit: 'reps' },
      { exerciseId: 'liegestuetze', sets: 2, min: 6, max: 15, unit: 'reps' },
      { exerciseId: 'schulterdruecken', sets: 2, min: 8, max: 12, unit: 'reps' },
      { exerciseId: 'reverse-crunch', sets: 2, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'plank', sets: 2, min: 20, max: 45, unit: 'sec' },
    ],
  },
  {
    id: 'arme-a',
    title: 'Arme und Bauch A',
    short: 'Arme A',
    focus: 'Bizeps, Trizeps und Schultern einarmig, damit beide Seiten gleich viel arbeiten. Dazu Rumpf.',
    exercises: [
      { exerciseId: 'bizepscurl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'hammer-curl', sets: 2, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'trizeps-ueberkopf', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'seitheben', sets: 3, min: 12, max: 20, unit: 'reps' },
      { exerciseId: 'dead-bug', sets: 2, min: 8, max: 12, unit: 'reps', repsPerSide: true },
      { exerciseId: 'side-plank', sets: 2, perSide: true, min: 20, max: 40, unit: 'sec' },
    ],
  },
  {
    id: 'fr-b',
    title: 'Brust und Rücken B',
    short: 'Brust/Rücken B',
    focus: 'Zweite Brust-Rücken-Einheit mit mehr Liegestützen, Überzügen und oberem Bauch.',
    exercises: [
      { exerciseId: 'floor-press', sets: 3, min: 8, max: 12, unit: 'reps' },
      { exerciseId: 'rudern', sets: 3, perSide: true, min: 8, max: 15, unit: 'reps' },
      { exerciseId: 'liegestuetze', sets: 3, min: 6, max: 15, unit: 'reps' },
      { exerciseId: 'ueberzuege', sets: 2, min: 10, max: 15, unit: 'reps', note: 'Nur wenn sie sich sicher anfühlen, sonst Reverse Fly.' },
      { exerciseId: 'seitheben', sets: 2, min: 12, max: 20, unit: 'reps' },
      { exerciseId: 'crunch', sets: 2, min: 12, max: 20, unit: 'reps' },
    ],
  },
  {
    id: 'ok-b',
    title: 'Oberkörper und Bauch B',
    short: 'Oberkörper B',
    focus: 'Flexible Einheit mit etwas weniger Volumen. Bei schlechter Erholung darf sie kürzer ausfallen.',
    flexible: true,
    exercises: [
      { exerciseId: 'hammer-curl', sets: 2, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'bizepscurl', sets: 2, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'trizeps-ueberkopf', sets: 2, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'floor-press', sets: 2, min: 10, max: 15, unit: 'reps', note: 'Etwas leichter als am Montag/Freitag.' },
      { exerciseId: 'rudern', sets: 2, perSide: true, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'reverse-crunch', sets: 2, min: 10, max: 15, unit: 'reps' },
    ],
  },
]

export const SESSION_MAP: Record<SessionId, TrainingSession> = Object.fromEntries([...SESSIONS, ...LEGACY_SESSIONS].map((s) => [s.id, s])) as Record<
  SessionId,
  TrainingSession
>

export const PLAN_RULES = {
  beginnerWeeks: 3,
  beginnerMaxSets: 2,
  reserveText: 'Saubere, kontrollierte Wiederholungen ohne Schwung. Einarmig immer links beginnen, rechts gleiches Gewicht und gleiche Wiederholungen.',
  extraWeakSetFromWeek: 4,
}
