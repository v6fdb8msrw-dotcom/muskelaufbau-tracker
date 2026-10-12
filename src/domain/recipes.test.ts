import { describe, expect, it } from 'vitest'
import { testSettings } from '../test/fixtures'
import { FOOD_MAP, FOODS } from '../data/foods'
import { RECIPE_CATEGORIES, RECIPES } from '../data/recipes'
import { recipeProfile } from './nutrition'
import { checkRecipe, defaultOptionalIncluded, foodStatus, includedIngredients } from './preferences'
import { recipeCost } from './recipes'

const settings = testSettings()

// Wörter, die in Standardrezepten nicht vorkommen dürfen (Ausschlüsse aus dem Profil)
const FORBIDDEN = [
  /pilz/i,
  /champignon/i,
  /blumenkohl/i,
  /rosenkohl/i,
  /brokkoli/i,
  /broccoli/i,
  /nuss/i,
  /nüsse/i,
  /pistazie/i,
  /mandel/i,
  /cashew/i,
  /garnele/i,
  /shrimp/i,
  /krabbe/i,
  /muschel/i,
  /tintenfisch/i,
  /calamar/i,
  /kohlrabi/i,
  /pesto/i,
  /kokos/i,
]

describe('130 Rezepte', () => {
  it('es sind genau 130 Rezepte mit eindeutigen IDs', () => {
    expect(RECIPES).toHaveLength(130)
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(130)
  })

  it('die Verteilung entspricht dem Plan', () => {
    for (const c of RECIPE_CATEGORIES) {
      expect(RECIPES.filter((r) => r.category === c.id).length, c.label).toBe(c.target)
    }
  })

  it('jedes Rezept ist vollständig', () => {
    for (const r of RECIPES) {
      expect(r.name.length, r.id).toBeGreaterThan(3)
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(3)
      expect(r.ingredients.length, r.id).toBeGreaterThanOrEqual(3)
      expect(r.minutes, r.id).toBeGreaterThan(0)
      expect(r.servings, r.id).toBe(1)
      for (const ing of r.ingredients) {
        expect(FOOD_MAP[ing.foodId], `${r.id}: ${ing.foodId}`).toBeDefined()
        expect(ing.amount, `${r.id}: ${ing.foodId}`).toBeGreaterThan(0)
      }
    }
  })

  it('die meisten Rezepte dauern höchstens 15 Minuten', () => {
    const quick = RECIPES.filter((r) => r.minutes <= 15).length
    expect(quick).toBeGreaterThanOrEqual(RECIPES.length * 0.8)
  })

  it('Protein-Kreationen liefern mindestens 40 g Eiweiß', () => {
    for (const r of RECIPES.filter((x) => x.category === 'protein-kreationen')) {
      expect(recipeProfile(r, settings).profile.values.protein, r.id).toBeGreaterThanOrEqual(40)
    }
  })

  it('ohne Proteinpulver fallen Rezepte mit Whey weg', () => {
    const noPowder = { ...settings, supplements: { ...settings.supplements, proteinPowderAvailable: false } }
    const withWhey = RECIPES.filter((r) => r.ingredients.some((i) => i.foodId === 'whey' && !i.optional))
    expect(withWhey.length).toBeGreaterThan(0)
    for (const r of withWhey) expect(checkRecipe(r, noPowder).allowed, r.id).toBe(false)
  })

  it('kein Rezept enthält ausgeschlossene Zutaten oder Begriffe', () => {
    for (const r of RECIPES) {
      expect(checkRecipe(r, settings).allowed, `${r.id} ${JSON.stringify(checkRecipe(r, settings).blocked)}`).toBe(true)
      const text = [r.name, ...r.steps, ...(r.tips ?? []), ...r.ingredients.map((i) => FOOD_MAP[i.foodId].name)].join(' ')
      for (const re of FORBIDDEN) expect(re.test(text), `${r.id}: ${re}`).toBe(false)
    }
  })

  it('Tomaten nur in der ausdrücklich gemochten Fertigpizza', () => {
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        const food = FOOD_MAP[ing.foodId]
        if (food.tags?.includes('tomato')) expect(food.id, r.id).toBe('pizza-salami')
      }
      const text = [r.name, ...r.steps].join(' ')
      if (r.id !== 'r096') expect(/tomate/i.test(text.replace(/ohne Tomate/gi, '')), r.id).toBe(false)
    }
  })

  it('keine gekochten Kartoffeln als Grundlage, Bratkartoffeln nur gelegentlich', () => {
    for (const r of RECIPES) {
      expect(r.ingredients.some((i) => FOOD_MAP[i.foodId].tags?.includes('potato')), r.id).toBe(false)
    }
    const fried = RECIPES.filter((r) => r.ingredients.some((i) => i.foodId === 'bratkartoffeln'))
    expect(fried.length).toBeLessThanOrEqual(3)
  })

  it('roher Spinat wird nie gekocht', () => {
    for (const r of RECIPES.filter((x) => x.ingredients.some((i) => i.foodId === 'babyspinat'))) {
      const text = r.steps.join(' ').toLowerCase()
      expect(text.includes('spinat'), r.id).toBe(true)
      expect(/spinat[^.]*(mitkoch|mitgar|dünst|anbrat|zusammenfall)/.test(text.replace(/nicht mit(gekocht|gegart)/g, '')), r.id).toBe(false)
    }
  })

  it('Gemüse außer Salat und rohem Spinat ist immer optional', () => {
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        if (FOOD_MAP[ing.foodId].pref === 'optional') expect(ing.optional, `${r.id}: ${ing.foodId}`).toBe(true)
      }
    }
  })

  it('optionale Zutaten werden erst nach Freigabe eingerechnet', () => {
    const r = RECIPES.find((x) => x.id === 'r001')!
    expect(defaultOptionalIncluded(r, settings)).toEqual([])
    const accepted = { ...settings, food: { ...settings.food, acceptedOptional: ['paprika'] } }
    expect(defaultOptionalIncluded(r, accepted)).toEqual(['paprika'])
    expect(includedIngredients(r, accepted).some((i) => i.foodId === 'paprika')).toBe(true)
  })

  it('Nährwerte und Kosten sind plausibel', () => {
    for (const r of RECIPES) {
      const p = recipeProfile(r, settings).profile.values
      expect(p.kcal, r.id).toBeGreaterThan(250)
      expect(p.kcal, r.id).toBeLessThan(1200)
      expect(p.protein, r.id).toBeGreaterThan(15)
      const cost = recipeCost(r, settings)
      expect(cost.total, r.id).toBeGreaterThan(0)
      expect(cost.shopping, r.id).toBeLessThan(6)
    }
  })

  it('zwei Portionen verdoppeln die Werte', () => {
    const r = RECIPES[0]
    const one = recipeProfile(r, settings, 1).profile.values.kcal!
    const two = recipeProfile(r, settings, 2).profile.values.kcal!
    expect(two).toBeCloseTo(one * 2, 5)
  })
})

describe('Lebensmittel', () => {
  it('ausgeschlossene Tags greifen, Ausnahmen bleiben erlaubt', () => {
    expect(foodStatus(FOOD_MAP['tomate'], settings).allowed).toBe(false)
    expect(foodStatus(FOOD_MAP['tomatensosse'], settings).allowed).toBe(false)
    expect(foodStatus(FOOD_MAP['kartoffeln'], settings).allowed).toBe(false)
    expect(foodStatus(FOOD_MAP['pizza-salami'], settings).kind).toBe('exception')
  })

  it('Makros passen grob zu den Kalorien', () => {
    for (const f of FOODS) {
      const { kcal, protein = 0, carbs = 0, fat = 0, fiber = 0 } = f.per100
      if (kcal === undefined || f.negligible || f.category === 'wuerze') continue
      const calc = protein * 4 + carbs * 4 + fat * 9 + fiber * 2
      expect(Math.abs(calc - kcal) / Math.max(kcal, 40), f.id).toBeLessThan(0.15)
    }
  })
})
