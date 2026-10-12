import { ARM_BALANCE_EXERCISES, EXERCISE_MAP } from '../data/exercises'
import type { ArmMeasurement, Settings, WorkoutLog } from '../types'

export interface SideStats {
  volume: number
  bestKg: number
  reps: number
  sets: number
}

export interface BalancePoint {
  date: string
  exerciseId: string
  left: SideStats
  right: SideStats
}

function stats(sets: WorkoutLog['exercises'][number]['sets'], side: 'left' | 'right'): SideStats {
  const s = sets.filter((x) => x.side === side)
  return {
    volume: s.reduce((sum, x) => sum + (x.weightKg ?? 0) * (x.reps ?? 0), 0),
    bestKg: Math.max(0, ...s.map((x) => x.weightKg ?? 0)),
    reps: s.reduce((sum, x) => sum + (x.reps ?? 0), 0),
    sets: s.length,
  }
}

/** Links-rechts-Werte aller einarmigen Armübungen im Zeitverlauf. */
export function balanceHistory(workouts: WorkoutLog[], exerciseId?: string): BalancePoint[] {
  const out: BalancePoint[] = []
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const ex of w.exercises) {
      if (!ARM_BALANCE_EXERCISES.includes(ex.exerciseId)) continue
      if (exerciseId && ex.exerciseId !== exerciseId) continue
      const left = stats(ex.sets, 'left')
      const right = stats(ex.sets, 'right')
      if (!left.sets && !right.sets) continue
      out.push({ date: w.date, exerciseId: ex.exerciseId, left, right })
    }
  }
  return out
}

export interface BalanceSummary {
  weaker: 'left' | 'right' | null
  /** Volumen der schwächeren Seite in Prozent der stärkeren (letzte Einheit je Übung, gemittelt) */
  ratio?: number
  perExercise: { exerciseId: string; name: string; date: string; weakerKg: number; strongerKg: number; ratio?: number }[]
  measurement?: { date: string; leftCm: number; rightCm: number; diff: number; state: ArmMeasurement['state'] }
}

export function balanceSummary(workouts: WorkoutLog[], arms: ArmMeasurement[], settings: Settings): BalanceSummary {
  const weaker = settings.arms.weakerSide
  const stronger = weaker === 'left' ? 'right' : 'left'
  const perExercise: BalanceSummary['perExercise'] = []
  for (const id of ARM_BALANCE_EXERCISES) {
    const hist = balanceHistory(workouts, id)
    const last = hist[hist.length - 1]
    if (!last || !weaker) continue
    const w = last[weaker]
    const s = last[stronger]
    perExercise.push({
      exerciseId: id,
      name: EXERCISE_MAP[id].name,
      date: last.date,
      weakerKg: w.bestKg,
      strongerKg: s.bestKg,
      ratio: s.volume > 0 ? w.volume / s.volume : undefined,
    })
  }
  const ratios = perExercise.map((p) => p.ratio).filter((r): r is number => r !== undefined)
  const sortedArms = [...arms].sort((a, b) => b.date.localeCompare(a.date))
  const lastFlexed = sortedArms.find((a) => a.state === 'angespannt') ?? sortedArms[0]
  return {
    weaker,
    ratio: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : undefined,
    perExercise,
    measurement: lastFlexed
      ? { date: lastFlexed.date, leftCm: lastFlexed.leftCm, rightCm: lastFlexed.rightCm, diff: lastFlexed.leftCm - lastFlexed.rightCm, state: lastFlexed.state }
      : undefined,
  }
}
