import { EXCLUDED_TAG_LABEL } from '../data/defaults'
import { FOOD_MAP } from '../data/foods'
import type { Food, Recipe, RecipeIngredient, Settings } from '../types'

export type FoodStatusKind = 'ok' | 'excluded' | 'avoided' | 'exception' | 'optional' | 'removed'

export interface FoodStatus {
  allowed: boolean
  kind: FoodStatusKind
  reason?: string
}

/** Prüft ein Lebensmittel gegen deine Ausschlüsse und Vorlieben. */
export function foodStatus(food: Food, settings: Settings): FoodStatus {
  const f = settings.food
  if (f.excludedFoods.includes(food.id)) {
    return { allowed: false, kind: 'removed', reason: 'Von dir ausgeschlossen' }
  }
  if (food.id === 'whey' && !settings.supplements.proteinPowderAvailable) {
    return { allowed: false, kind: 'removed', reason: 'Proteinpulver ist in den Einstellungen ausgeschaltet' }
  }
  const tags = food.tags ?? []
  const excludedTag = tags.find((t) => f.excludedTags.includes(t))
  const avoidedTag = tags.find((t) => f.avoidTags.includes(t))
  if (excludedTag || avoidedTag) {
    const tag = (excludedTag ?? avoidedTag)!
    if (f.exceptions.includes(food.id)) {
      return { allowed: true, kind: 'exception', reason: `Enthält ${EXCLUDED_TAG_LABEL[tag]}, aber ausdrücklich erlaubt` }
    }
    return {
      allowed: false,
      kind: excludedTag ? 'excluded' : 'avoided',
      reason: excludedTag ? `Ausgeschlossen: ${EXCLUDED_TAG_LABEL[tag]}` : `Standardmäßig vermieden: ${EXCLUDED_TAG_LABEL[tag]}`,
    }
  }
  if (food.pref === 'optional' && !f.acceptedOptional.includes(food.id)) {
    return { allowed: true, kind: 'optional', reason: 'Optionales Gemüse, noch nicht fest freigegeben' }
  }
  return { allowed: true, kind: 'ok' }
}

export function isFoodAllowed(foodId: string, settings: Settings): boolean {
  const food = FOOD_MAP[foodId]
  return !!food && foodStatus(food, settings).allowed
}

/** Wird eine optionale Zutat standardmäßig eingeplant? Nur wenn du das Gemüse freigegeben hast. */
export function optionalDefaultOn(foodId: string, settings: Settings): boolean {
  const food = FOOD_MAP[foodId]
  if (!food || !foodStatus(food, settings).allowed) return false
  return settings.food.acceptedOptional.includes(foodId) || food.pref !== 'optional'
}

export interface RecipeCheck {
  allowed: boolean
  blocked: { foodId: string; reason: string }[]
}

/** Ein Rezept ist erlaubt, wenn alle festen Zutaten erlaubt sind. Optionale Zutaten fallen notfalls weg. */
export function checkRecipe(recipe: Recipe, settings: Settings): RecipeCheck {
  const blocked: RecipeCheck['blocked'] = []
  for (const ing of recipe.ingredients) {
    if (ing.optional) continue
    const food = FOOD_MAP[ing.foodId]
    if (!food) {
      blocked.push({ foodId: ing.foodId, reason: 'Unbekannte Zutat' })
      continue
    }
    const st = foodStatus(food, settings)
    if (!st.allowed) blocked.push({ foodId: ing.foodId, reason: st.reason ?? 'nicht erlaubt' })
  }
  return { allowed: blocked.length === 0, blocked }
}

/** Optionale Zutaten, die bei einem Rezept standardmäßig mitgerechnet werden. */
export function defaultOptionalIncluded(recipe: Recipe, settings: Settings): string[] {
  return recipe.ingredients.filter((i) => i.optional && optionalDefaultOn(i.foodId, settings)).map((i) => i.foodId)
}

/** Zutaten, die tatsächlich verwendet werden: alle festen plus die gewählten optionalen. */
export function includedIngredients(recipe: Recipe, settings: Settings, optionalIncluded?: string[]): RecipeIngredient[] {
  const chosen = optionalIncluded ?? defaultOptionalIncluded(recipe, settings)
  return recipe.ingredients.filter((i) => {
    if (!i.optional) return true
    return chosen.includes(i.foodId) && isFoodAllowed(i.foodId, settings)
  })
}
