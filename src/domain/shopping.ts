import { FOOD_MAP } from '../data/foods'
import { RECIPE_MAP } from '../data/recipes'
import { addDays, weekdayIndex } from '../lib/date'
import type { Food, MealPlanEntry, PantryItem, Settings } from '../types'
import { includedIngredients } from './preferences'
import { isAlwaysAvailable, packOf } from './recipes'

/*
 * Vorschläge aus dem Wochenplan: Welche Zutaten brauchst du für die geplanten Rezepte?
 * Das ist nur eine Hilfe. Die Einkaufsliste selbst und das Budget bestehen aus deinen
 * eigenen Einträgen mit echten Preisen (siehe purchases.ts).
 */

export interface NeedLine {
  foodId: string
  food: Food
  /** Bedarf laut Wochenplan */
  needed: number
  inPantry: number
  toBuy: number
  /** Grobe Richtgröße, wie viele Standardpackungen das wären */
  packs: number
  packLabel: string
  /** Geschätzte Kosten (Richtwert aus der Datenbank, kein Marktpreis) */
  estimate: number
  recipes: string[]
}

export interface PlanNeeds {
  weekStart: string
  lines: NeedLine[]
  estimateTotal: number
  lunchDays: { date: string; label: string; recipeId?: string; leftover: boolean; mondayLeftovers: boolean }[]
}

export function isWeekdayLunch(entry: Pick<MealPlanEntry, 'date' | 'slot'>): boolean {
  return entry.slot === 'mittag' && weekdayIndex(entry.date) <= 4
}

export function planForWeek(mealPlan: MealPlanEntry[], weekStart: string): MealPlanEntry[] {
  const end = addDays(weekStart, 6)
  return mealPlan.filter((m) => m.date >= weekStart && m.date <= end).sort((a, b) => a.date.localeCompare(b.date))
}

export function pantryAmount(pantry: PantryItem[], foodId: string): number {
  return pantry.filter((p) => p.kind === 'food' && p.foodId === foodId).reduce((s, p) => s + p.amount, 0)
}

export function planNeeds(weekStart: string, mealPlan: MealPlanEntry[], pantry: PantryItem[], settings: Settings): PlanNeeds {
  const week = planForWeek(mealPlan, weekStart)
  const needs = new Map<string, { amount: number; recipes: Set<string> }>()

  for (const entry of week) {
    if (entry.leftoverOf) continue
    const recipe = RECIPE_MAP[entry.recipeId]
    if (!recipe) continue
    const factor = entry.portions / recipe.servings
    for (const ing of includedIngredients(recipe, settings, entry.optionalIncluded)) {
      const food = FOOD_MAP[ing.foodId]
      if (!food || isAlwaysAvailable(food, settings)) continue
      const n = needs.get(food.id) ?? { amount: 0, recipes: new Set<string>() }
      n.amount += ing.amount * factor
      n.recipes.add(recipe.name)
      needs.set(food.id, n)
    }
  }

  const lines: NeedLine[] = []
  for (const [foodId, n] of needs) {
    const food = FOOD_MAP[foodId]
    const pack = packOf(food, settings) ?? { amount: n.amount, price: 0, label: '' }
    const inPantry = pantryAmount(pantry, foodId)
    const toBuy = Math.max(0, n.amount - inPantry)
    const packs = toBuy > 0.5 ? Math.ceil(toBuy / pack.amount - 1e-9) : 0
    lines.push({
      foodId,
      food,
      needed: n.amount,
      inPantry,
      toBuy,
      packs,
      packLabel: pack.label,
      estimate: packs * pack.price,
      recipes: [...n.recipes],
    })
  }
  lines.sort((a, b) => a.food.category.localeCompare(b.food.category) || a.food.name.localeCompare(b.food.name))

  const lunchDays = [0, 1, 2, 3, 4].map((i) => {
    const date = addDays(weekStart, i)
    const entry = week.find((m) => m.date === date && m.slot === 'mittag')
    return {
      date,
      label: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i],
      recipeId: entry?.recipeId,
      leftover: !!entry?.leftoverOf,
      mondayLeftovers: i === 0 && settings.budget.mondayLeftovers && !entry,
    }
  })

  return { weekStart, lines, estimateTotal: lines.reduce((s, l) => s + l.estimate, 0), lunchDays }
}
