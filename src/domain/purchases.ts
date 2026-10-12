import type { Nutrients, Product, Settings, ShoppingItem } from '../types'
import { productProfile } from './nutrition'

/*
 * Deine Einkaufsliste: Freihand-Einträge mit echten Preisen und (optional) eigenen Produkten
 * mit Etikettwerten. Daraus berechnet die App Budget, Kosten pro Portion und Nährwerte.
 */

export function itemsForWeek(items: ShoppingItem[], week: string): ShoppingItem[] {
  return items.filter((i) => i.week === week)
}

export function itemTotal(item: ShoppingItem): number | undefined {
  return item.price === undefined ? undefined : item.price * item.packs
}

export interface WeekBudget {
  budget: number
  min: number
  /** Schon gekauft (abgehakt) */
  bought: number
  /** Noch auf der Liste */
  planned: number
  co2: number
  /** Budget minus gekauft minus geplant */
  free: number
  /** Einträge ohne Preis (zählen noch nicht mit) */
  withoutPrice: number
  status: 'frei' | 'knapp' | 'ueber'
}

export function weekBudget(items: ShoppingItem[], week: string, settings: Settings): WeekBudget {
  const list = itemsForWeek(items, week).filter((i) => i.inBudget)
  const bought = list.filter((i) => i.checked).reduce((s, i) => s + (itemTotal(i) ?? 0), 0)
  const planned = list.filter((i) => !i.checked).reduce((s, i) => s + (itemTotal(i) ?? 0), 0)
  const co2 = settings.budget.co2Needed ? settings.budget.co2Price : 0
  const budget = settings.budget.max
  const free = budget - bought - planned - co2
  return {
    budget,
    min: settings.budget.min,
    bought,
    planned,
    co2,
    free,
    withoutPrice: list.filter((i) => i.price === undefined).length,
    status: free < 0 ? 'ueber' : free < budget * 0.15 ? 'knapp' : 'frei',
  }
}

export interface ProductAnalysis {
  portion: number
  portionLabel: string
  perPortion: Nutrients
  /** Portionen in einer Packung */
  portionsPerPack?: number
  /** Preis pro Portion */
  pricePerPortion?: number
  /** Gramm Protein pro Euro */
  proteinPerEuro?: number
  /** Gramm Protein pro 100 kcal (Proteindichte) */
  proteinPer100kcal?: number
  /** Protein in einer ganzen Packung */
  proteinPerPack?: number
  rating?: 'top' | 'gut' | 'normal'
}

/** Kennzahlen eines Produkts aus deinen Etikettwerten. */
export function analyzeProduct(product: Product, price?: number): ProductAnalysis {
  const portion = product.serving ?? (product.kind === 'protein' ? 30 : 100)
  const perPortion = productProfile(product, portion).values
  const p = price ?? product.price
  const portionsPerPack = product.size && portion > 0 ? product.size / portion : undefined
  const pricePerPortion = p !== undefined && portionsPerPack ? p / portionsPerPack : undefined
  const proteinPerPack = product.size && product.per100.protein !== undefined ? (product.per100.protein * product.size) / 100 : undefined
  const proteinPerEuro = p && proteinPerPack !== undefined ? proteinPerPack / p : undefined
  const proteinPer100kcal =
    product.per100.protein !== undefined && product.per100.kcal ? (product.per100.protein / product.per100.kcal) * 100 : undefined
  const rating = proteinPer100kcal === undefined ? undefined : proteinPer100kcal >= 15 ? 'top' : proteinPer100kcal >= 8 ? 'gut' : 'normal'
  return {
    portion,
    portionLabel: product.portionLabel ?? `${portion} ${product.unit}`,
    perPortion,
    portionsPerPack,
    pricePerPortion,
    proteinPerEuro,
    proteinPer100kcal,
    proteinPerPack,
    rating,
  }
}

export interface MealGroup {
  meal: string
  items: ShoppingItem[]
  cost: number
  /** Summe der Nährwerte aller gekauften Mengen (alle Packungen) */
  kcal?: number
  protein?: number
}

/** Einträge nach „Für welches Essen“ gruppieren und Kosten sowie Gesamt-Protein addieren. */
export function groupByMeal(items: ShoppingItem[], products: Product[]): MealGroup[] {
  const map = new Map<string, ShoppingItem[]>()
  for (const i of items) {
    const key = i.meal?.trim() || 'Ohne Zuordnung'
    map.set(key, [...(map.get(key) ?? []), i])
  }
  return [...map.entries()]
    .map(([meal, list]) => {
      let kcal: number | undefined
      let protein: number | undefined
      for (const i of list) {
        const p = products.find((x) => x.id === i.productId)
        if (!p?.size) continue
        const total = productProfile(p, p.size * i.packs).values
        if (total.kcal !== undefined) kcal = (kcal ?? 0) + total.kcal
        if (total.protein !== undefined) protein = (protein ?? 0) + total.protein
      }
      return { meal, items: list, cost: list.reduce((s, i) => s + (itemTotal(i) ?? 0), 0), kcal, protein }
    })
    .sort((a, b) => (a.meal === 'Ohne Zuordnung' ? 1 : b.meal === 'Ohne Zuordnung' ? -1 : a.meal.localeCompare(b.meal)))
}

/** Werte, die auf dem Etikett „pro Portion“ stehen, in Werte pro 100 g/ml umrechnen. */
export function perPortionToPer100(values: Nutrients, portion: number): Nutrients {
  const out: Nutrients = {}
  if (portion <= 0) return out
  for (const [k, v] of Object.entries(values)) if (typeof v === 'number') out[k as keyof Nutrients] = (v / portion) * 100
  return out
}
