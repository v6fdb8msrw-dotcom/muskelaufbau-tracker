import type { MealSlot, Recipe, RecipeCategory, RecipeIngredient } from '../../types'

/** [Lebensmittel-ID, Menge in g/ml, 'opt' für optionale Zutat] */
export type Ing = [string, number] | [string, number, 'opt']

interface Options {
  meals?: MealSlot[]
  keeps?: boolean
  tips?: string[]
  intro?: string
}

/** Kompakte Schreibweise für ein Rezept mit einer Portion. */
export function recipe(
  id: string,
  name: string,
  category: RecipeCategory,
  minutes: number,
  ingredients: Ing[],
  steps: string[],
  options: Options = {},
): Recipe {
  return {
    id,
    name,
    category,
    servings: 1,
    minutes,
    ingredients: ingredients.map(
      ([foodId, amount, flag]): RecipeIngredient => (flag === 'opt' ? { foodId, amount, optional: true } : { foodId, amount }),
    ),
    steps,
    meals: options.meals ?? ['mittag', 'abend'],
    keeps: options.keeps,
    tips: options.tips,
    intro: options.intro,
  }
}
