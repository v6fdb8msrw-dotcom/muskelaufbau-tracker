import { FOOD_MAP } from '../data/foods'
import { RECIPE_MAP } from '../data/recipes'
import { foodProfile, productProfile, recipeProfile, scaleProfile } from '../domain/nutrition'
import { includedIngredients } from '../domain/preferences'
import { isAlwaysAvailable } from '../domain/recipes'
import type { SuggestionAction } from '../domain/weekly'
import { diffDays, nowTime, startOfWeek, timeToSlot } from '../lib/date'
import { stamp } from '../lib/id'
import type {
  DataSet,
  DrinkLogEntry,
  FoodLogEntry,
  MealPlanEntry,
  MealSlot,
  NutrientKey,
  Nutrients,
  PantryItem,
  Product,
  ScheduleChange,
  Settings,
  ShoppingCheck,
  SuggestionState,
  SupplementLogEntry,
  TargetWeight,
} from '../types'
import type { Store } from './store'

const now = () => new Date().toISOString()

interface When {
  date: string
  time?: string
  meal?: MealSlot
}

function when(w: When) {
  const time = w.time ?? nowTime()
  return { date: w.date, time, meal: w.meal ?? timeToSlot(time) }
}

export function buildRecipeLog(
  recipeId: string,
  settings: Settings,
  w: When & { portions?: number; optionalIncluded?: string[]; planId?: string },
): FoodLogEntry {
  const recipe = RECIPE_MAP[recipeId]
  const portions = w.portions ?? 1
  const calc = recipeProfile(recipe, settings, portions, w.optionalIncluded)
  const optionalIncluded = includedIngredients(recipe, settings, w.optionalIncluded)
    .filter((i) => i.optional)
    .map((i) => i.foodId)
  return stamp<FoodLogEntry>({
    ...when(w),
    name: portions === 1 ? recipe.name : `${recipe.name} (${portions} Portionen)`,
    source: { kind: 'recipe', recipeId, portions, optionalIncluded },
    nutrients: calc.profile.values,
    partial: calc.profile.partial,
    planId: w.planId,
  })
}

export function buildFoodLog(foodId: string, amount: number, w: When): FoodLogEntry {
  const food = FOOD_MAP[foodId]
  const p = foodProfile(food, amount)
  return stamp<FoodLogEntry>({
    ...when(w),
    name: food.name,
    source: { kind: 'food', foodId, amount },
    nutrients: p.values,
    partial: p.partial,
    negligible: food.negligible,
  })
}

export function buildProductLog(product: Product, amount: number, w: When): FoodLogEntry {
  const p = productProfile(product, amount)
  return stamp<FoodLogEntry>({
    ...when(w),
    name: product.name,
    source: { kind: 'product', productId: product.id, amount },
    nutrients: p.values,
    partial: p.partial,
  })
}

export function buildFreeLog(name: string, nutrients: Nutrients, w: When & { note?: string }): FoodLogEntry {
  return stamp<FoodLogEntry>({
    ...when(w),
    name,
    source: { kind: 'free' },
    nutrients,
    partial: [],
    note: w.note,
  })
}

export function buildLeftoverLog(item: PantryItem, portions: number, w: When): FoodLogEntry {
  const values: Nutrients = {}
  for (const [k, v] of Object.entries(item.nutrients ?? {})) values[k as NutrientKey] = (v as number) * portions
  return stamp<FoodLogEntry>({
    ...when(w),
    name: `${item.name} (Rest)`,
    source: { kind: 'leftover', pantryId: item.id, recipeId: item.recipeId, portions },
    nutrients: values,
    partial: item.partial ?? [],
  })
}

export function buildDrinkLog(opts: { drinkId: string; ml: number; date: string; time?: string; product?: Product }): DrinkLogEntry {
  const time = opts.time ?? nowTime()
  if (opts.product) {
    const p = productProfile(opts.product, opts.ml)
    return stamp<DrinkLogEntry>({
      date: opts.date,
      time,
      drinkId: opts.drinkId,
      productId: opts.product.id,
      name: opts.product.name,
      ml: opts.ml,
      nutrients: p.values,
      partial: p.partial,
    })
  }
  const food = FOOD_MAP[opts.drinkId]
  const p = foodProfile(food, opts.ml)
  return stamp<DrinkLogEntry>({
    date: opts.date,
    time,
    drinkId: opts.drinkId,
    name: food.name,
    ml: opts.ml,
    nutrients: p.values,
    partial: p.partial,
    negligible: food.negligible,
  })
}

export function buildCreatineLog(grams: number, date: string, time?: string): SupplementLogEntry {
  return stamp<SupplementLogEntry>({
    date,
    time: time ?? nowTime(),
    kind: 'creatine',
    grams,
    nutrients: { kcal: 0 },
    partial: [],
    negligible: true,
  })
}

/** Proteinshake: Nährwerte erst, wenn er wirklich getrunken wurde. Flüssigkeit zählt zur Trinkmenge. */
export function buildProteinLog(opts: {
  product: Product
  grams: number
  liquid: 'wasser' | 'milch'
  liquidMl: number
  date: string
  time?: string
}): SupplementLogEntry {
  const powder = productProfile(opts.product, opts.grams)
  const values: Nutrients = { ...powder.values }
  const partial = new Set(powder.partial)
  if (opts.liquid === 'milch') {
    const milk = foodProfile(FOOD_MAP.milch, opts.liquidMl)
    for (const [k, v] of Object.entries(milk.values)) {
      const key = k as NutrientKey
      if (values[key] === undefined) partial.add(key)
      values[key] = (values[key] ?? 0) + (v as number)
    }
  }
  return stamp<SupplementLogEntry>({
    date: opts.date,
    time: opts.time ?? nowTime(),
    kind: 'protein',
    grams: opts.grams,
    productId: opts.product.id,
    liquid: opts.liquid,
    liquidMl: opts.liquidMl,
    nutrients: values,
    partial: [...partial],
  })
}

/** Möglicher Doppeleintrag: gleicher Name am selben Tag innerhalb von 20 Minuten. */
export function findDuplicate<T extends { id: string; date: string; time: string; name: string }>(list: T[], candidate: T): T | undefined {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  return list.find(
    (e) => e.id !== candidate.id && e.date === candidate.date && e.name === candidate.name && Math.abs(toMin(e.time) - toMin(candidate.time)) <= 20,
  )
}

/** Zutaten eines gegessenen Rezepts aus dem Vorrat abziehen (nur, was dort liegt). */
export function pantryAfterCooking(pantry: PantryItem[], recipeId: string, settings: Settings, portions: number, optionalIncluded?: string[]) {
  const recipe = RECIPE_MAP[recipeId]
  const updates: PantryItem[] = []
  const removals: string[] = []
  const factor = portions / recipe.servings
  for (const ing of includedIngredients(recipe, settings, optionalIncluded)) {
    const food = FOOD_MAP[ing.foodId]
    if (isAlwaysAvailable(food, settings)) continue
    let need = ing.amount * factor
    for (const item of pantry.filter((p) => p.kind === 'food' && p.foodId === food.id)) {
      if (need <= 0) break
      const take = Math.min(item.amount, need)
      need -= take
      const rest = item.amount - take
      if (rest <= 0.5) removals.push(item.id)
      else updates.push({ ...item, amount: rest, updatedAt: now() })
    }
  }
  return { updates, removals }
}

export function buildLeftoverItem(recipeId: string, settings: Settings, portions: number, optionalIncluded?: string[]): PantryItem {
  const recipe = RECIPE_MAP[recipeId]
  const per = scaleProfile(recipeProfile(recipe, settings, 1, optionalIncluded).profile, 1)
  return stamp<PantryItem>({
    kind: 'leftover',
    recipeId,
    name: recipe.name,
    amount: portions,
    unit: 'Portion',
    nutrients: per.values,
    partial: per.partial,
  })
}

/** Vorschlag aus der Wochenkorrektur übernehmen. */
export async function applySuggestion(store: Store, id: string, action: SuggestionAction) {
  switch (action.type) {
    case 'addMeal':
      await store.save(
        'mealPlan',
        stamp<MealPlanEntry>({ date: action.date, slot: action.slot, recipeId: action.recipeId, portions: action.portions }),
      )
      break
    case 'swapMeal': {
      const entry = store.data.mealPlan.find((m) => m.id === action.planId)
      if (entry) {
        const linked = store.data.mealPlan.filter((m) => m.leftoverOf === entry.id)
        await store.save('mealPlan', [
          { ...entry, recipeId: action.recipeId, optionalIncluded: undefined, updatedAt: now() },
          ...linked.map((l) => ({ ...l, recipeId: action.recipeId, updatedAt: now() })),
        ])
      }
      break
    }
    case 'addShopping': {
      const existing = store.data.shopping.find((s) => s.week === action.week && s.foodId === action.foodId)
      await store.save(
        'shopping',
        existing
          ? { ...existing, extraAmount: (existing.extraAmount ?? 0) + action.amount, updatedAt: now() }
          : stamp<ShoppingCheck>({ id: `${action.week}:${action.foodId}`, week: action.week, foodId: action.foodId, checked: false, extraAmount: action.amount }),
      )
      break
    }
    case 'setKcal':
      await store.updateSettings((s) => ({ ...s, targets: { ...s.targets, kcal: action.value } }))
      break
    case 'moveSession': {
      const existing = store.data.schedule.find((s) => s.id === action.key)
      await store.save('schedule', existing ? { ...existing, movedTo: action.to, skipped: false, updatedAt: now() } : stamp<ScheduleChange>({ id: action.key, movedTo: action.to }))
      break
    }
    case 'enableExtraWeakSet':
      await store.updateSettings((s) => ({ ...s, program: { ...s.program, extraWeakSet: true } }))
      break
    case 'setTargetWeight': {
      const existing = store.data.targetWeights.find((t) => t.id === action.id)
      await store.save('targetWeights', existing ? { ...existing, kg: action.kg, updatedAt: now() } : stamp<TargetWeight>({ id: action.id, kg: action.kg }))
      break
    }
    case 'note':
      break
  }
  await store.save('suggestions', stamp<SuggestionState>({ id, status: 'accepted' }))
}

export async function ignoreSuggestion(store: Store, id: string) {
  await store.save('suggestions', stamp<SuggestionState>({ id, status: 'ignored' }))
}

export function weekKey(date: string): string {
  return startOfWeek(date)
}

export function daysSince(iso: string | undefined, today: string): number | undefined {
  if (!iso) return undefined
  return diffDays(today, iso.slice(0, 10))
}

export type { DataSet }
