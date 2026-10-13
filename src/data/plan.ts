import type { CardioBlock, SessionId, TrainingSession } from '../types'

/** Farmer’s Walk mit leichten Hanteln, am lockeren Sonntag. */
const FARMERS_WALK: CardioBlock = { exerciseId: 'farmers-walk', min: 15, max: 15, note: 'Walking-Pad 2–4 km/h, leichte Hanteln' }

/** Kurz aufwärmen vor den Hanteln. */
const WARMUP = '2–3 Minuten Armkreisen, dann 1 leichter Satz der ersten Übung mit etwa halbem Gewicht'

/** Rudern einmal pro Woche, locker am Sonntag. */
export const WEEKLY_ROWING: CardioBlock = { exerciseId: 'rudergeraet', min: 15, max: 15, note: 'Einmal pro Woche, locker' }

/**
 * Der Trainingsplan: 100 % Oberkörper für einen Einsteiger mit großem Seitenunterschied.
 * Jeden Tag kurz: Montag bis Samstag Pull (A) und Push (B) im Wechsel, erst Hanteln,
 * 1–2 Stunden später ein Calisthenics-Block. So kommt jeder Muskel 3× pro Woche dran und hat
 * dazwischen einen Tag Pause. Sonntag ist Hantelpause (locker Farmer’s Walk und Rudern).
 * Der Umfang steigt über 16 Wochen in Phasen (siehe PHASES). Einarmig immer links zuerst.
 * Keine Beinübungen, keine Klimmzugstange.
 */
export const SESSIONS: TrainingSession[] = [
  {
    id: 'pull-a',
    title: 'Tag A · Pull',
    short: 'Pull',
    focus: 'Rücken und Bizeps mit Hanteln.',
    block: 'Hanteln',
    warmupText: WARMUP,
    exercises: [
      { exerciseId: 'rudern', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true, note: 'Hauptübung Rücken' },
      { exerciseId: 'kh-rudern-vorgebeugt', sets: 3, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'bizepscurl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true, note: 'Ohne Schwung' },
      { exerciseId: 'hammer-curl', sets: 2, perSide: true, min: 10, max: 15, unit: 'reps', optional: true, note: 'Für Armdicke und Unterarm' },
      { exerciseId: 'reverse-fly', sets: 2, min: 12, max: 20, unit: 'reps', optional: true, note: 'Leichte Hanteln, Haltung' },
    ],
  },
  {
    id: 'cali-a',
    title: 'Tag A · Calisthenics',
    short: 'Cali A',
    focus: 'Bauch und Rumpf, 1–2 Stunden nach den Hanteln.',
    block: 'Calisthenics · 1–2 h später',
    exercises: [
      { exerciseId: 'plank', sets: 2, min: 20, max: 120, unit: 'sec', toFailure: true, note: 'Bis zum Muskelversagen' },
      { exerciseId: 'reverse-crunch', sets: 2, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'tischrudern', sets: 2, min: 6, max: 15, unit: 'reps', optional: true, note: 'Nur an einem sehr stabilen Tisch' },
    ],
  },
  {
    id: 'push-b',
    title: 'Tag B · Push',
    short: 'Push',
    focus: 'Brust, Schultern und Trizeps mit Hanteln.',
    block: 'Hanteln',
    warmupText: WARMUP,
    exercises: [
      { exerciseId: 'floor-press', sets: 3, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'schulterdruecken', sets: 3, min: 10, max: 15, unit: 'reps' },
      { exerciseId: 'seitheben', sets: 3, min: 12, max: 20, unit: 'reps', note: 'Für breitere Schultern' },
      { exerciseId: 'trizeps-ueberkopf', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'boden-flys', sets: 2, min: 12, max: 15, unit: 'reps', optional: true },
    ],
  },
  {
    id: 'cali-b',
    title: 'Tag B · Calisthenics',
    short: 'Cali B',
    focus: 'Liegestütze und Bauch, 1–2 Stunden nach den Hanteln.',
    block: 'Calisthenics · 1–2 h später',
    exercises: [
      { exerciseId: 'liegestuetze', sets: 3, min: 8, max: 20, unit: 'reps', priority: true, note: 'Deine Stufe, siehe Anleitung' },
      { exerciseId: 'crunch', sets: 2, min: 12, max: 20, unit: 'reps' },
      { exerciseId: 'hollow-body', sets: 2, min: 15, max: 45, unit: 'sec', toFailure: true },
      { exerciseId: 'stuhl-dips', sets: 2, min: 8, max: 15, unit: 'reps', optional: true },
    ],
  },
  {
    id: 'leicht',
    title: 'Sonntag · Locker',
    short: 'Locker',
    focus: 'Hantelpause. Farmer’s Walk und Rudern, beides locker.',
    block: 'Locker',
    warmup: FARMERS_WALK,
    exercises: [],
  },
]

export interface Phase {
  id: 'technik' | 'aufbau' | 'intensiv' | 'peak' | 'test'
  name: string
  from: number
  to: number
  /** Sätze je Übung (Schwerpunkt-Übungen bekommen ab Phase 2 einen mehr) */
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
    sets: 2,
    prioritySets: 3,
    effort: '1–2 Wiederholungen wären noch gegangen',
    rules: [
      'Die wichtigsten Übungen (Rudern, Bizepscurls, Floor Press, Trizeps, Liegestütze) bekommen einen 3. Satz. Schaffst du in allen Sätzen die obere Zahl sauber, nächstes Mal mehr Gewicht (oder schwerere Stufe).',
      'Ab jetzt ein Zusatzsatz nur für den linken Arm bei den einarmigen Armübungen.',
      'Pausen: 60–90 Sekunden bei Armübungen, bis 2 Minuten bei Rudern und Drücken.',
    ],
  },
  {
    id: 'intensiv',
    name: 'Intensiv',
    from: 9,
    to: 12,
    sets: 2,
    prioritySets: 3,
    effort: 'Letzter Satz bis knapp ans Versagen',
    rules: [
      'Mehr Intensität statt mehr Sätze: Jeder Muskel kommt 3× pro Woche dran, das reicht an Umfang.',
      'Im letzten Satz so viele saubere Wiederholungen wie möglich.',
      'Liegestütze eine Stufe schwerer, sobald 3 × 20 klappen.',
      'Sehr müde? Dann den Calisthenics-Block weglassen, das kostet fast nichts.',
    ],
  },
  {
    id: 'peak',
    name: 'Peak',
    from: 13,
    to: 15,
    sets: 2,
    prioritySets: 3,
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
    id: 'arme-c',
    title: 'Tag C · Arme & Calisthenics',
    short: 'Arme',
    focus: 'Fünfte Einheit für Bizeps und Trizeps mit Calisthenics-Übungen.',
    exercises: [
      { exerciseId: 'diamant-liegestuetze', sets: 3, min: 6, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'stuhl-dips', sets: 3, min: 8, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'konzentrationscurl', sets: 3, perSide: true, min: 10, max: 15, unit: 'reps', priority: true },
      { exerciseId: 'trizeps-kickback', sets: 3, perSide: true, min: 12, max: 15, unit: 'reps' },
      { exerciseId: 'hollow-body', sets: 3, min: 15, max: 45, unit: 'sec', toFailure: true },
      { exerciseId: 'russian-twist', sets: 2, min: 15, max: 15, unit: 'reps', repsPerSide: true, note: 'Mit Kurzhantel' },
      { exerciseId: 'kh-halo', sets: 2, min: 10, max: 10, unit: 'reps', optional: true, note: 'Kettlebell-Ersatz, je Richtung' },
    ],
  },
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
