import { FOOD_MAP } from '../data/foods'
import { SNACKS, type DayPart, type Snack } from '../data/snacks'
import type { NutrientProfile } from '../types'
import { combineProfiles, foodProfile } from './nutrition'

export function snackProfile(snack: Snack): NutrientProfile {
  return combineProfiles(snack.items.map(([id, amount]) => ({ profile: foodProfile(FOOD_MAP[id], amount), ignoreMissing: !!FOOD_MAP[id].negligible })))
}

export function dayPart(hour: number): DayPart {
  if (hour < 11) return 'morgens'
  if (hour < 18) return 'tagsueber'
  return 'abends'
}

export interface SnackTip {
  snack: Snack
  kcal: number
  protein: number
}

/**
 * Snack-Tipps passend zum Tag: Fehlt noch Eiweiß, Snacks mit Eiweiß; ist es geschafft,
 * kalorienreiche Snacks, die wenig satt machen. Nur Snacks, die in die offenen Kalorien passen.
 * Die Reihenfolge wechselt täglich (seed), damit es nicht langweilig wird.
 */
export function snackTips(opts: { kcalOpen: number; proteinOpen: number; hour: number; seed: number }): SnackTip[] {
  if (opts.kcalOpen < 150) return []
  const part = dayPart(opts.hour)
  const wantProtein = opts.proteinOpen > 20
  const tips = SNACKS.map((snack) => {
    const v = snackProfile(snack).values
    return { snack, kcal: v.kcal ?? 0, protein: v.protein ?? 0 }
  }).filter((t) => t.kcal <= opts.kcalOpen + 100)
  const score = (t: SnackTip) => {
    let s = 0
    if (t.snack.when.includes(part)) s += 2
    if (wantProtein) s += t.snack.kind === 'eiweiss' ? 3 : t.snack.kind === 'beides' ? 2 : 0
    else s += t.snack.kind === 'kalorien' ? 3 : t.snack.kind === 'beides' ? 1 : 0
    // täglich wechselnde, aber stabile Reihenfolge
    s += ((Number(t.snack.id.slice(1)) * 7 + opts.seed) % 10) / 10
    return s
  }
  return tips.sort((a, b) => score(b) - score(a))
}
