import { FOOD_MAP } from '../data/foods'
import { NUTRIENT_META, NUTRIENTS, referenceFor } from '../data/nutrients'
import { RECIPES } from '../data/recipes'
import type { Food, NutrientKey, PantryItem, Recipe, Settings } from '../types'
import { foodProfile, recipeProfile, type RecipeCalc } from './nutrition'
import { checkRecipe, includedIngredients } from './preferences'

export function packOf(food: Food, settings: Settings): { amount: number; price: number; label: string } | undefined {
  const o = settings.prices[food.id]
  if (!food.pack && !o) return undefined
  return {
    amount: o?.amount ?? food.pack?.amount ?? 100,
    price: o?.price ?? food.pack?.price ?? 0,
    label: o?.amount ? `${o.amount} ${food.unit}` : (food.pack?.label ?? ''),
  }
}

export function pricePerUnit(food: Food, settings: Settings): number | undefined {
  const pack = packOf(food, settings)
  return pack && pack.amount > 0 ? pack.price / pack.amount : undefined
}

/** Wird das Lebensmittel als vorhanden angenommen (Brot/Belag oder Grundvorrat)? */
export function isAlwaysAvailable(food: Food, settings: Settings): boolean {
  if (food.staple) return true
  if (food.basic) return settings.basics[food.id] !== false
  return false
}

export interface RecipeCost {
  /** Kosten der Zutaten, die man einkaufen muss (ohne Brot/Belag/Grundvorrat) */
  shopping: number
  /** Kosten aller Zutaten inkl. Vorrat */
  total: number
}

export function recipeCost(recipe: Recipe, settings: Settings, portions = 1, optionalIncluded?: string[]): RecipeCost {
  const ings = includedIngredients(recipe, settings, optionalIncluded)
  const factor = portions / recipe.servings
  let shopping = 0
  let total = 0
  for (const ing of ings) {
    const food = FOOD_MAP[ing.foodId]
    const ppu = pricePerUnit(food, settings) ?? 0
    const c = ppu * ing.amount * factor
    total += c
    if (!isAlwaysAvailable(food, settings)) shopping += c
  }
  return { shopping, total }
}

export interface NutrientSource {
  key: NutrientKey
  share: number
  mainFood: string
}

/** Wichtige Nährstoffquellen: Nährstoffe, von denen eine Portion mindestens 25 % des Tagesbedarfs liefert. */
export function keySources(calc: RecipeCalc, settings: Settings, limit = 5): NutrientSource[] {
  const out: NutrientSource[] = []
  for (const meta of NUTRIENTS) {
    if (meta.limit || ['kcal', 'carbs', 'fat', 'sugar', 'satFat', 'omega3'].includes(meta.key)) continue
    const ref = referenceFor(meta.key, settings)
    const v = calc.profile.values[meta.key]
    if (!ref || v === undefined) continue
    const share = v / ref
    if (share < 0.25) continue
    let best = ''
    let bestVal = 0
    for (const line of calc.lines) {
      if (!line.included) continue
      const lv = foodProfile(line.food, line.amount).values[meta.key] ?? 0
      if (lv > bestVal) {
        bestVal = lv
        best = line.food.name
      }
    }
    out.push({ key: meta.key, share, mainFood: best })
  }
  return out.sort((a, b) => b.share - a.share).slice(0, limit)
}

/** Zutaten, die aus Vorrat oder Grundvorrat kommen. */
export function pantryUse(recipe: Recipe, settings: Settings, pantry: PantryItem[], optionalIncluded?: string[]) {
  const ings = includedIngredients(recipe, settings, optionalIncluded)
  return ings
    .map((ing) => {
      const food = FOOD_MAP[ing.foodId]
      const inPantry = pantry.filter((p) => p.kind === 'food' && p.foodId === food.id).reduce((s, p) => s + p.amount, 0)
      return {
        food,
        amount: ing.amount,
        always: isAlwaysAvailable(food, settings),
        inPantry,
        covered: isAlwaysAvailable(food, settings) || inPantry >= ing.amount,
      }
    })
    .filter((x) => x.always || x.inPantry > 0)
}

/** Günstige Alternativen: rezeptspezifische Tipps plus Hinweise zu den teuersten Zutaten. */
export function cheapAlternatives(recipe: Recipe, settings: Settings): string[] {
  const tips = [...(recipe.tips ?? [])]
  const ings = includedIngredients(recipe, settings)
    .map((ing) => {
      const food = FOOD_MAP[ing.foodId]
      return { food, cost: (pricePerUnit(food, settings) ?? 0) * ing.amount }
    })
    .filter((x) => x.food.cheaper && !isAlwaysAvailable(x.food, settings))
    .sort((a, b) => b.cost - a.cost)
  for (const x of ings.slice(0, 3)) tips.push(`${x.food.name}: ${x.food.cheaper}`)
  if (recipe.keeps) tips.push('Gleich 2 Portionen kochen: Die zweite Portion ist das Mittagessen für morgen und spart einen Einkauf.')
  return tips
}

export interface RecipeSummary {
  recipe: Recipe
  calc: RecipeCalc
  cost: RecipeCost
  allowed: boolean
  kcal: number
  protein: number
}

export function summarizeRecipe(recipe: Recipe, settings: Settings): RecipeSummary {
  const calc = recipeProfile(recipe, settings)
  return {
    recipe,
    calc,
    cost: recipeCost(recipe, settings),
    allowed: checkRecipe(recipe, settings).allowed,
    kcal: calc.profile.values.kcal ?? 0,
    protein: calc.profile.values.protein ?? 0,
  }
}

export function allRecipeSummaries(settings: Settings): RecipeSummary[] {
  return RECIPES.map((r) => summarizeRecipe(r, settings))
}

/** Menge lesbar machen, z. B. „2 Ei (M) · 110 g“. */
export function formatAmount(food: Food, amount: number): string {
  const unit = food.unit
  const base = `${Math.round(amount * 10) / 10} ${unit}`
  if (food.piece) {
    const pieces = amount / food.piece.amount
    const roundedHalf = Math.round(pieces * 2) / 2
    if (roundedHalf >= 0.5 && Math.abs(pieces - roundedHalf) / pieces < 0.12) {
      const n = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(roundedHalf)
      return `${n} × ${food.piece.label} · ${base}`
    }
  }
  return base
}

export function nutrientLabel(key: NutrientKey): string {
  return NUTRIENT_META[key].short ?? NUTRIENT_META[key].label
}
