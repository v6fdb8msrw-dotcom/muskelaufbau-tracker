import { FOOD_MAP } from '../data/foods'
import { RECIPES } from '../data/recipes'
import { addDays } from '../lib/date'
import type { FoodLogEntry, PantryItem, Recipe, Settings } from '../types'
import { recipeProfile } from './nutrition'
import { checkRecipe, includedIngredients } from './preferences'
import { isAlwaysAvailable, packOf } from './recipes'

export type PlanMode = 'abwechslung' | 'mealprep'

export interface PlanDraftEntry {
  date: string
  slot: 'mittag'
  recipeId: string
  portions: number
  leftoverOfIndex?: number
}

/** Kleiner deterministischer Zufallsgenerator, damit „Neu vorschlagen“ reproduzierbar variiert. */
function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function lunchCandidates(settings: Settings, mode: PlanMode): Recipe[] {
  return RECIPES.filter((r) => {
    if (!r.meals.includes('mittag')) return false
    if (!checkRecipe(r, settings).allowed) return false
    if (r.minutes > 20) return false
    if (mode === 'mealprep' && !r.keeps) return false
    const protein = recipeProfile(r, settings).profile.values.protein ?? 0
    return protein >= 30
  })
}

/** Kassenpreis, der durch ein Rezept zusätzlich anfällt, wenn Reste aus angebrochenen Packungen genutzt werden. */
function marginalCash(recipe: Recipe, portions: number, settings: Settings, stock: Map<string, number>): number {
  let cash = 0
  for (const ing of includedIngredients(recipe, settings)) {
    const food = FOOD_MAP[ing.foodId]
    if (isAlwaysAvailable(food, settings)) continue
    const pack = packOf(food, settings)
    if (!pack) continue
    const need = ing.amount * portions
    const have = stock.get(food.id) ?? 0
    const missing = Math.max(0, need - have)
    if (missing > 0) cash += Math.ceil(missing / pack.amount - 1e-9) * pack.price
  }
  return cash
}

function consume(recipe: Recipe, portions: number, settings: Settings, stock: Map<string, number>) {
  for (const ing of includedIngredients(recipe, settings)) {
    const food = FOOD_MAP[ing.foodId]
    if (isAlwaysAvailable(food, settings)) continue
    const pack = packOf(food, settings)
    if (!pack) continue
    const need = ing.amount * portions
    let have = stock.get(food.id) ?? 0
    while (have < need) have += pack.amount
    stock.set(food.id, have - need)
  }
}

/**
 * Schlägt Mittagessen für eine Woche vor (Di–Fr, Montag nur, wenn keine Wochenendreste eingestellt sind).
 * Ziel: genug Protein, wenig Kassenpreis durch gemeinsame Zutaten, Favoriten bevorzugt, Abwechslung.
 */
export function generateLunchPlan(options: {
  weekStart: string
  settings: Settings
  pantry: PantryItem[]
  recentLogs: FoodLogEntry[]
  mode: PlanMode
  seed: number
  skipDates?: string[]
}): PlanDraftEntry[] {
  const { weekStart, settings, pantry, recentLogs, mode, seed } = options
  const days = [0, 1, 2, 3, 4]
    .filter((i) => !(i === 0 && settings.budget.mondayLeftovers))
    .map((i) => addDays(weekStart, i))
    .filter((d) => !options.skipDates?.includes(d))
  const random = rng(seed + 7919)
  const candidates = lunchCandidates(settings, mode)
  const recentRecipeIds = new Set(
    recentLogs.filter((l) => l.source.kind === 'recipe').map((l) => (l.source as { recipeId: string }).recipeId),
  )
  const stock = new Map<string, number>()
  for (const p of pantry) if (p.kind === 'food' && p.foodId) stock.set(p.foodId, (stock.get(p.foodId) ?? 0) + p.amount)

  const result: PlanDraftEntry[] = []
  const used = new Set<string>()
  let lastCategory = ''
  let i = 0
  while (i < days.length) {
    const date = days[i]
    const prep = mode === 'mealprep' && i + 1 < days.length
    const portions = prep ? 2 : 1
    let best: { recipe: Recipe; score: number } | undefined
    for (const r of candidates) {
      if (used.has(r.id)) continue
      const protein = recipeProfile(r, settings).profile.values.protein ?? 0
      let score = marginalCash(r, portions, settings, stock) / portions
      score -= Math.min(protein, 50) * 0.035
      if (settings.favorites.includes(r.id)) score -= 0.6
      if (recentRecipeIds.has(r.id)) score += 0.8
      if (r.category === lastCategory) score += 0.5
      if (r.category === 'convenience') score += 0.4
      score += random() * 0.9
      if (!best || score < best.score) best = { recipe: r, score }
    }
    if (!best) break
    used.add(best.recipe.id)
    lastCategory = best.recipe.category
    consume(best.recipe, portions, settings, stock)
    const index = result.length
    result.push({ date, slot: 'mittag', recipeId: best.recipe.id, portions })
    if (prep) {
      result.push({ date: days[i + 1], slot: 'mittag', recipeId: best.recipe.id, portions: 1, leftoverOfIndex: index })
      i += 2
    } else {
      i += 1
    }
  }
  return result
}
