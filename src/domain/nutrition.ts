import { FOOD_MAP } from '../data/foods'
import { NUTRIENT_META, referenceFor } from '../data/nutrients'
import { RECIPE_MAP } from '../data/recipes'
import { addDays } from '../lib/date'
import {
  NUTRIENT_KEYS,
  type DataSet,
  type Food,
  type NutrientKey,
  type NutrientProfile,
  type Nutrients,
  type Product,
  type Recipe,
  type Settings,
} from '../types'
import { includedIngredients } from './preferences'

/** Zutaten unter dieser Menge lösen keine Datenlücke aus (Gewürze, ein Spritzer Zitrone). */
const MINOR_AMOUNT = 10

export const EMPTY_PROFILE: NutrientProfile = { values: {}, partial: [] }

/** Rohwerte pro 100 g auf die Menge umrechnen und abgeleitete Werte ergänzen. */
export function scalePer100(per100: Nutrients, amount: number): Nutrients {
  const out: Nutrients = {}
  const f = amount / 100
  for (const key of NUTRIENT_KEYS) {
    const v = per100[key]
    if (v !== undefined) out[key] = v * f
  }
  // Niacin-Äquivalente: Niacin + Tryptophan/60, Tryptophan ≈ 1,2 % des Proteins → 0,2 mg NE je g Protein
  if (out.b3 !== undefined && out.protein !== undefined) out.b3 += out.protein * 0.2
  // Omega-3 gesamt aus ALA + EPA/DHA, falls nicht direkt angegeben
  if (out.omega3 === undefined && out.ala !== undefined && out.epaDha !== undefined) out.omega3 = out.ala + out.epaDha / 1000
  return out
}

export function foodProfile(food: Food, amount: number): NutrientProfile {
  return { values: scalePer100(food.per100, amount), partial: [] }
}

export function productProfile(product: Product, amount: number): NutrientProfile {
  return { values: scalePer100(product.per100, amount), partial: [] }
}

interface Part {
  profile: NutrientProfile
  /** Fehlende Werte dieses Teils lösen keine Datenlücke aus. */
  ignoreMissing: boolean
}

/** Mehrere Nährwertprofile addieren. Fehlende Werte machen das Ergebnis zur Untergrenze. */
export function combineProfiles(parts: Part[]): NutrientProfile {
  const values: Nutrients = {}
  const partial = new Set<NutrientKey>()
  for (const key of NUTRIENT_KEYS) {
    let sum = 0
    let has = false
    let missing = false
    for (const p of parts) {
      const v = p.profile.values[key]
      if (v === undefined) {
        if (!p.ignoreMissing) missing = true
        continue
      }
      has = true
      sum += v
      if (p.profile.partial.includes(key)) partial.add(key)
    }
    if (has) {
      values[key] = sum
      if (missing) partial.add(key)
    }
  }
  return { values, partial: [...partial] }
}

export function scaleProfile(profile: NutrientProfile, factor: number): NutrientProfile {
  const values: Nutrients = {}
  for (const key of NUTRIENT_KEYS) {
    const v = profile.values[key]
    if (v !== undefined) values[key] = v * factor
  }
  return { values, partial: [...profile.partial] }
}

export interface RecipeLine {
  foodId: string
  food: Food
  amount: number
  optional: boolean
  included: boolean
}

export interface RecipeCalc {
  profile: NutrientProfile
  lines: RecipeLine[]
  portions: number
}

/** Nährwerte eines Rezepts für die gewünschte Portionenzahl. */
export function recipeProfile(recipe: Recipe, settings: Settings, portions = 1, optionalIncluded?: string[]): RecipeCalc {
  const included = includedIngredients(recipe, settings, optionalIncluded)
  const factor = portions / recipe.servings
  const lines: RecipeLine[] = recipe.ingredients.map((ing) => ({
    foodId: ing.foodId,
    food: FOOD_MAP[ing.foodId],
    amount: ing.amount * factor,
    optional: !!ing.optional,
    included: included.includes(ing),
  }))
  const profile = combineProfiles(
    lines
      .filter((l) => l.included)
      .map((l) => ({
        profile: foodProfile(l.food, l.amount),
        ignoreMissing: !!l.food.negligible || l.amount / factor < MINOR_AMOUNT,
      })),
  )
  return { profile, lines, portions }
}

// ---------- Tageswerte ----------

export interface DayTotals {
  profile: NutrientProfile
  fluidMl: number
  entryCount: number
  foodCount: number
  /** Schlüssel ohne jede Angabe an diesem Tag */
  unknown: NutrientKey[]
}

export function entriesForDate(data: DataSet, date: string) {
  return {
    foods: data.foodLogs.filter((e) => e.date === date),
    drinks: data.drinkLogs.filter((e) => e.date === date),
    supplements: data.supplementLogs.filter((e) => e.date === date),
  }
}

export function dayTotals(data: DataSet, date: string): DayTotals {
  const { foods, drinks, supplements } = entriesForDate(data, date)
  const parts: Part[] = [
    ...foods.map((e) => ({ profile: { values: e.nutrients, partial: e.partial }, ignoreMissing: !!e.negligible })),
    ...drinks.map((e) => ({ profile: { values: e.nutrients, partial: e.partial }, ignoreMissing: !!e.negligible })),
    ...supplements.map((e) => ({ profile: { values: e.nutrients, partial: e.partial }, ignoreMissing: !!e.negligible })),
  ]
  const profile = combineProfiles(parts)
  const fluidMl = drinks.reduce((s, d) => s + d.ml, 0) + supplements.reduce((s, d) => s + (d.liquidMl ?? 0), 0)
  const unknown = parts.length ? NUTRIENT_KEYS.filter((k) => profile.values[k] === undefined) : [...NUTRIENT_KEYS]
  return { profile, fluidMl, entryCount: parts.length, foodCount: foods.length, unknown }
}

export type ValueState = 'known' | 'partial' | 'unknown'

export function valueState(profile: NutrientProfile, key: NutrientKey): ValueState {
  if (profile.values[key] === undefined) return 'unknown'
  return profile.partial.includes(key) ? 'partial' : 'known'
}

/** Anteil am Referenzwert (0–∞) oder undefined, wenn kein Referenzwert oder keine Daten. */
export function share(profile: NutrientProfile, key: NutrientKey, settings: Settings): number | undefined {
  const ref = referenceFor(key, settings)
  const v = profile.values[key]
  if (ref === undefined || v === undefined || ref === 0) return undefined
  return v / ref
}

// ---------- Mehrtägige Auswertung ----------

export interface RangeDay {
  date: string
  totals: DayTotals
  complete: boolean
  hasEntries: boolean
}

export interface RangeAnalysis {
  days: RangeDay[]
  /** Tage, die in den Durchschnitt eingehen */
  usedDays: RangeDay[]
  /** true, wenn keiner der Tage als vollständig markiert ist und deshalb alle Tage mit Einträgen zählen */
  provisional: boolean
  averages: Record<NutrientKey, { value?: number; daysWithData: number; partial: boolean }>
  avgFluid?: number
}

/**
 * Durchschnitt über einen Zeitraum. Es zählen nur Tage, die du als vollständig markiert hast.
 * Gibt es keine solchen Tage, zählen vorläufig alle Tage mit Einträgen.
 * Tage ohne Einträge zählen nie als Nullkonsum.
 */
export function analyzeRange(data: DataSet, endDate: string, length = 7): RangeAnalysis {
  const completeSet = new Set(data.days.filter((d) => d.complete).map((d) => d.date))
  const days: RangeDay[] = []
  for (let i = length - 1; i >= 0; i--) {
    const date = addDays(endDate, -i)
    const totals = dayTotals(data, date)
    days.push({ date, totals, complete: completeSet.has(date), hasEntries: totals.entryCount > 0 })
  }
  let usedDays = days.filter((d) => d.complete && d.hasEntries)
  const provisional = usedDays.length === 0
  if (provisional) usedDays = days.filter((d) => d.hasEntries)

  const averages = {} as RangeAnalysis['averages']
  for (const key of NUTRIENT_KEYS) {
    const withData = usedDays.filter((d) => d.totals.profile.values[key] !== undefined)
    const partial = withData.some((d) => d.totals.profile.partial.includes(key)) || withData.length < usedDays.length
    averages[key] = {
      value: withData.length ? withData.reduce((s, d) => s + (d.totals.profile.values[key] ?? 0), 0) / withData.length : undefined,
      daysWithData: withData.length,
      partial,
    }
  }
  const avgFluid = usedDays.length ? usedDays.reduce((s, d) => s + d.totals.fluidMl, 0) / usedDays.length : undefined
  return { days, usedDays, provisional, averages, avgFluid }
}

export function formatNutrient(key: NutrientKey, value: number | undefined): string {
  if (value === undefined) return '–'
  const meta = NUTRIENT_META[key]
  const dec = value >= 100 ? 0 : meta.decimals
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: dec }).format(value)} ${meta.unit}`
}

export function recipeById(id: string): Recipe | undefined {
  return RECIPE_MAP[id]
}

/** Nährwerte für einen frei eingegebenen Eintrag (nur, was eingegeben wurde). */
export function freeEntryNutrients(input: Partial<Record<'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', number | undefined>>): Nutrients {
  const out: Nutrients = {}
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k as NutrientKey] = v
  }
  return out
}
