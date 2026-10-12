import { FOOD_MAP } from '../data/foods'
import { referenceFor } from '../data/nutrients'
import { RECIPES } from '../data/recipes'
import type { NutrientKey, Product, Recipe, Settings } from '../types'
import { foodProfile, productProfile, recipeProfile } from './nutrition'
import { checkRecipe, foodStatus } from './preferences'

/** Kuratierte Quellen je Nährstoff mit typischen Portionen (aus deinen akzeptierten Lebensmitteln). */
const SOURCES: Partial<Record<NutrientKey, [string, number, string?][]>> = {
  protein: [
    ['haehnchenbrust', 150],
    ['thunfisch', 130, '1 Dose'],
    ['magerquark', 250, '1/2 Becher'],
    ['skyr', 200],
    ['ei', 110, '2 Eier'],
    ['huettenkaese', 200, '1 Becher'],
    ['lachsfilet', 125],
    ['linsen-dose', 265, '1 Dose'],
    ['kaese-scheiben', 50, '2 Scheiben'],
  ],
  vitC: [
    ['kiwi', 150, '2 Kiwis'],
    ['orange', 150, '1 Orange'],
    ['beeren', 150],
    ['paprika', 150, '1 Paprika'],
    ['orangensaft', 200, '1 Glas'],
    ['feldsalat', 80],
  ],
  calcium: [
    ['kaese-scheiben', 50, '2 Scheiben'],
    ['milch', 300, '1 großes Glas'],
    ['joghurt', 250],
    ['parmesan', 20],
    ['mozzarella', 125, '1 Kugel'],
    ['magerquark', 250],
  ],
  magnesium: [
    ['vollkornbrot', 100, '2 Scheiben'],
    ['schwarze-bohnen', 240, '1 Dose'],
    ['weisse-bohnen', 250, '1 Dose'],
    ['linsen-rot', 70],
    ['vollkornnudeln', 100],
    ['banane', 120, '1 Banane'],
  ],
  potassium: [
    ['weisse-bohnen', 250, '1 Dose'],
    ['kidneybohnen', 250, '1 Dose'],
    ['linsen-dose', 265, '1 Dose'],
    ['banane', 120, '1 Banane'],
    ['babyspinat', 60],
    ['avocado', 75, '1/2 Avocado'],
  ],
  iron: [
    ['rinderhack', 125],
    ['rinderhuefte', 150],
    ['linsen-rot', 70],
    ['linsen-dose', 265, '1 Dose'],
    ['weisse-bohnen', 250, '1 Dose'],
    ['babyspinat', 60],
  ],
  zinc: [
    ['rinderhack', 125],
    ['rinderhuefte', 150],
    ['kaese-scheiben', 50, '2 Scheiben'],
    ['parmesan', 30],
    ['ei', 110, '2 Eier'],
    ['linsen-rot', 70],
  ],
  iodine: [
    ['seelachs', 150],
    ['milch', 300, '1 großes Glas'],
    ['joghurt', 250],
    ['ei', 110, '2 Eier'],
    ['jodsalz', 2, 'eine Prise Jodsalz beim Kochen'],
  ],
  folate: [
    ['linsen-rot', 70],
    ['linsen-dose', 265, '1 Dose'],
    ['romanasalat', 100],
    ['babyspinat', 60],
    ['kidneybohnen', 250, '1 Dose'],
    ['ei', 110, '2 Eier'],
  ],
  fiber: [
    ['vollkornbrot', 100, '2 Scheiben'],
    ['kidneybohnen', 250, '1 Dose'],
    ['linsen-dose', 265, '1 Dose'],
    ['kichererbsen', 240, '1 Dose'],
    ['beeren', 150],
    ['apfel', 150, '1 Apfel'],
    ['vollkornnudeln', 100],
  ],
  epaDha: [['lachsfilet', 125], ['raeucherlachs', 75], ['thunfisch', 130, '1 Dose'], ['fischstaebchen', 150, '5 Stück']],
  omega3: [['lachsfilet', 125], ['rapsoel', 10, '1 EL Rapsöl'], ['raeucherlachs', 75]],
  ala: [['rapsoel', 10, '1 EL Rapsöl'], ['mayonnaise', 15]],
  vitD: [['lachsfilet', 125], ['raeucherlachs', 75], ['ei', 110, '2 Eier']],
  b12: [['lachsfilet', 125], ['thunfisch', 130, '1 Dose'], ['rinderhack', 125], ['reibekaese', 40], ['ei', 110, '2 Eier']],
  vitA: [['karotte', 80, '1 Karotte'], ['romanasalat', 100], ['babyspinat', 60], ['ei', 110, '2 Eier'], ['kaese-scheiben', 50]],
  vitK: [['babyspinat', 60], ['romanasalat', 100], ['fruehlingszwiebel', 30], ['kiwi', 150, '2 Kiwis']],
  vitE: [['rapsoel', 10, '1 EL Rapsöl'], ['avocado', 75], ['lachsfilet', 125], ['babyspinat', 60]],
  selenium: [['thunfisch', 130, '1 Dose'], ['ei', 110, '2 Eier'], ['schweineschnitzel', 150], ['vollkornnudeln', 100]],
  b1: [['schweineschnitzel', 150], ['schweinefilet', 150], ['vollkornbrot', 100], ['linsen-rot', 70]],
  b2: [['milch', 300], ['ei', 110], ['magerquark', 250], ['feta', 50]],
  b6: [['haehnchenbrust', 150], ['lachsfilet', 125], ['banane', 120], ['putenbrust', 150]],
  b3: [['haehnchenbrust', 150], ['thunfisch', 130], ['putenbrust', 150]],
  b5: [['ei', 110], ['lachsfilet', 125], ['avocado', 75], ['haehnchenbrust', 150]],
  biotin: [['ei', 110, '2 Eier'], ['milch', 300]],
  phosphorus: [['kaese-scheiben', 50], ['haehnchenbrust', 150], ['linsen-rot', 70], ['milch', 300]],
  copper: [['linsen-rot', 70], ['kichererbsen', 240], ['vollkornnudeln', 100], ['vollkornbrot', 100]],
}

export interface FoodIdea {
  label: string
  amountLabel: string
  value: number
  share?: number
  foodId?: string
  productId?: string
}

/** Konkrete Lebensmittel-Ideen für einen Nährstoff, gefiltert nach deinen Ausschlüssen und Freigaben. */
export function foodIdeas(key: NutrientKey, settings: Settings, products: Product[] = [], limit = 5): FoodIdea[] {
  const ref = referenceFor(key, settings)
  const ideas: FoodIdea[] = []
  for (const [id, amount, label] of SOURCES[key] ?? []) {
    const food = FOOD_MAP[id]
    if (!food) continue
    const st = foodStatus(food, settings)
    if (!st.allowed) continue
    if (st.kind === 'optional') continue // nur akzeptiertes Gemüse vorschlagen
    const value = foodProfile(food, amount).values[key]
    if (value === undefined || value <= 0) continue
    ideas.push({
      label: food.name,
      amountLabel: label ?? `${amount} ${food.unit}`,
      value,
      share: ref ? value / ref : undefined,
      foodId: id,
    })
  }
  // Eigene Produkte (z. B. gekaufte Smoothies) mit Etikettwerten
  for (const p of products) {
    const portion = p.kind === 'protein' ? 30 : p.size && p.size <= 500 ? p.size : 250
    const value = productProfile(p, portion).values[key]
    if (value === undefined || value <= 0) continue
    if (p.kind === 'protein' && !settings.supplements.proteinPowderAvailable) continue
    ideas.push({
      label: p.kind === 'protein' ? `${p.name} (freiwillig)` : p.name,
      amountLabel: `${portion} ${p.unit}`,
      value,
      share: ref ? value / ref : undefined,
      productId: p.id,
    })
  }
  return ideas.sort((a, b) => b.value - a.value).slice(0, limit)
}

export interface RecipeIdea {
  recipe: Recipe
  value: number
  share?: number
  kcal: number
}

/** Rezepte, die viel von einem Nährstoff liefern und in die übrigen Kalorien passen. */
export function recipeIdeas(key: NutrientKey, settings: Settings, opts: { maxKcal?: number; limit?: number; slot?: string } = {}): RecipeIdea[] {
  const ref = referenceFor(key, settings)
  const out: RecipeIdea[] = []
  for (const r of RECIPES) {
    if (!checkRecipe(r, settings).allowed) continue
    if (opts.slot && !r.meals.includes(opts.slot as Recipe['meals'][number])) continue
    const p = recipeProfile(r, settings).profile
    const value = p.values[key]
    const kcal = p.values.kcal ?? 0
    if (value === undefined) continue
    if (opts.maxKcal !== undefined && kcal > opts.maxKcal) continue
    out.push({ recipe: r, value, share: ref ? value / ref : undefined, kcal })
  }
  return out.sort((a, b) => b.value / Math.max(b.kcal, 200) - a.value / Math.max(a.kcal, 200)).slice(0, opts.limit ?? 4)
}
