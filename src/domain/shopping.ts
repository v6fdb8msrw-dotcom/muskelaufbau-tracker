import { FOOD_MAP } from '../data/foods'
import { RECIPE_MAP } from '../data/recipes'
import { addDays, weekdayIndex } from '../lib/date'
import type { Food, MealPlanEntry, PantryItem, Settings, ShoppingCheck } from '../types'
import { includedIngredients } from './preferences'
import { isAlwaysAvailable, packOf } from './recipes'

export interface ShoppingLine {
  foodId: string
  food: Food
  /** Bedarf laut Wochenplan */
  needed: number
  /** davon für Mittagessen Mo–Fr (Budget) */
  neededBudget: number
  inPantry: number
  toBuy: number
  packs: number
  packAmount: number
  packLabel: string
  packPrice: number
  /** Kassenpreis der zu kaufenden Packungen */
  cash: number
  /** Kosten der tatsächlich verbrauchten Menge */
  used: number
  /** Anteil des Kassenpreises, der ins Budget fällt */
  budgetCash: number
  recipes: string[]
  checked: boolean
  transferred: boolean
}

export interface DrinkBudgetLine {
  id: string
  name: string
  weeklyMl: number
  packs: number
  cash: number
  used: number
}

export interface ShoppingResult {
  weekStart: string
  lines: ShoppingLine[]
  drinks: DrinkBudgetLine[]
  co2: number
  lunchCash: number
  lunchUsed: number
  drinksCash: number
  budgetCash: number
  outsideCash: number
  status: 'unter' | 'im' | 'ueber'
  lunchDays: { date: string; label: string; recipeId?: string; leftover: boolean; mondayLeftovers: boolean }[]
}

export function isBudgetMeal(entry: Pick<MealPlanEntry, 'date' | 'slot'>): boolean {
  return entry.slot === 'mittag' && weekdayIndex(entry.date) <= 4
}

export function planForWeek(mealPlan: MealPlanEntry[], weekStart: string): MealPlanEntry[] {
  const end = addDays(weekStart, 6)
  return mealPlan.filter((m) => m.date >= weekStart && m.date <= end).sort((a, b) => a.date.localeCompare(b.date))
}

export function pantryAmount(pantry: PantryItem[], foodId: string): number {
  return pantry.filter((p) => p.kind === 'food' && p.foodId === foodId).reduce((s, p) => s + p.amount, 0)
}

export function computeShopping(
  weekStart: string,
  mealPlan: MealPlanEntry[],
  pantry: PantryItem[],
  settings: Settings,
  checks: ShoppingCheck[],
): ShoppingResult {
  const week = planForWeek(mealPlan, weekStart)
  const needs = new Map<string, { amount: number; budget: number; recipes: Set<string> }>()

  for (const entry of week) {
    if (entry.leftoverOf) continue
    const recipe = RECIPE_MAP[entry.recipeId]
    if (!recipe) continue
    const factor = entry.portions / recipe.servings
    for (const ing of includedIngredients(recipe, settings, entry.optionalIncluded)) {
      const food = FOOD_MAP[ing.foodId]
      if (!food || isAlwaysAvailable(food, settings)) continue
      const n = needs.get(food.id) ?? { amount: 0, budget: 0, recipes: new Set<string>() }
      n.amount += ing.amount * factor
      if (isBudgetMeal(entry)) n.budget += ing.amount * factor
      n.recipes.add(recipe.name)
      needs.set(food.id, n)
    }
  }

  // Zusätzliche Artikel (z. B. Obst aus einem Vorschlag) zählen nicht zum Mittagessen-Budget
  for (const c of checks) {
    if (c.week !== weekStart || !c.extraAmount) continue
    const food = FOOD_MAP[c.foodId]
    if (!food) continue
    const n = needs.get(food.id) ?? { amount: 0, budget: 0, recipes: new Set<string>() }
    n.amount += c.extraAmount
    n.recipes.add('Zusätzlich')
    needs.set(food.id, n)
  }

  const checkMap = new Map(checks.filter((c) => c.week === weekStart).map((c) => [c.foodId, c]))
  const lines: ShoppingLine[] = []
  for (const [foodId, n] of needs) {
    const food = FOOD_MAP[foodId]
    const pack = packOf(food, settings) ?? { amount: n.amount, price: 0, label: '' }
    const check = checkMap.get(foodId)
    // Bereits übernommene Einkäufe liegen jetzt im Vorrat und werden nicht doppelt abgezogen
    const inPantry = check?.transferred ? 0 : pantryAmount(pantry, foodId)
    const toBuy = check?.transferred ? 0 : Math.max(0, n.amount - inPantry)
    const packs = toBuy > 0.5 ? Math.ceil(toBuy / pack.amount - 1e-9) : 0
    const purchasedPacks = check?.transferred ? (check.boughtPacks ?? 0) : packs
    const cash = purchasedPacks * pack.price
    const used = (n.amount / pack.amount) * pack.price
    lines.push({
      foodId,
      food,
      needed: n.amount,
      neededBudget: n.budget,
      inPantry,
      toBuy,
      packs: purchasedPacks,
      packAmount: pack.amount,
      packLabel: pack.label,
      packPrice: pack.price,
      cash,
      used,
      budgetCash: n.amount > 0 ? cash * (n.budget / n.amount) : 0,
      recipes: [...n.recipes],
      checked: !!check?.checked,
      transferred: !!check?.transferred,
    })
  }
  lines.sort((a, b) => a.food.category.localeCompare(b.food.category) || a.food.name.localeCompare(b.food.name))

  const drinks: DrinkBudgetLine[] = settings.funDrinks
    .filter((d) => d.inBudget)
    .map((d) => {
      const weeklyMl = d.frequency === 'daily' ? d.ml * 7 : d.ml * d.perWeek
      const packs = d.packMl > 0 ? Math.ceil(weeklyMl / d.packMl - 1e-9) : 0
      return {
        id: d.id,
        name: d.name,
        weeklyMl,
        packs,
        cash: packs * d.packPrice,
        used: d.packMl > 0 ? (weeklyMl / d.packMl) * d.packPrice : 0,
      }
    })

  const co2 = settings.budget.co2Needed ? settings.budget.co2Price : 0
  const lunchCash = lines.reduce((s, l) => s + l.budgetCash, 0)
  const lunchUsed = lines.reduce((s, l) => s + (l.needed > 0 ? l.used * (l.neededBudget / l.needed) : 0), 0)
  const drinksCash = drinks.reduce((s, d) => s + d.cash, 0)
  const budgetCash = lunchCash + drinksCash + co2
  const outsideCash = lines.reduce((s, l) => s + (l.cash - l.budgetCash), 0)
  const status = budgetCash > settings.budget.max ? 'ueber' : budgetCash < settings.budget.min ? 'unter' : 'im'

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

  return { weekStart, lines, drinks, co2, lunchCash, lunchUsed, drinksCash, budgetCash, outsideCash, status, lunchDays }
}
