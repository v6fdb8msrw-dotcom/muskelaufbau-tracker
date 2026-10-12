import type { SessionId, TrainingSession } from '../types'

/** Der Trainingsplan: vier Einheiten pro Woche, Schwerpunkt Brust, Rücken, Arme, Bauch. */
export const SESSIONS: TrainingSession[] = [
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

export const SESSION_MAP: Record<SessionId, TrainingSession> = Object.fromEntries(SESSIONS.map((s) => [s.id, s])) as Record<
  SessionId,
  TrainingSession
>

export const PLAN_RULES = {
  beginnerWeeks: 2,
  beginnerMaxSets: 2,
  reserveText: 'Bei den meisten Übungen 1–3 saubere Wiederholungen in Reserve lassen (also nicht bis zum völligen Versagen).',
  extraWeakSetFromWeek: 7,
}
