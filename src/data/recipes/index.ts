import type { Recipe, RecipeCategory } from '../../types'
import { BROT } from './brot'
import { CONVENIENCE } from './convenience'
import { FISCH } from './fisch'
import { FLEISCH } from './fleisch'
import { HUELSEN } from './huelsen'
import { REIS_NUDEL } from './reisNudel'
import { SALATE } from './salate'
import { TORTELLINI } from './tortellini'

export const RECIPES: Recipe[] = [
  ...REIS_NUDEL,
  ...TORTELLINI,
  ...FLEISCH,
  ...FISCH,
  ...HUELSEN,
  ...SALATE,
  ...BROT,
  ...CONVENIENCE,
]

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]))

export const RECIPE_CATEGORIES: { id: RecipeCategory; label: string; target: number }[] = [
  { id: 'reis-nudel-pfanne', label: 'Reis, Nudeln & Pfanne', target: 20 },
  { id: 'tortellini-maultaschen', label: 'Tortellini & Maultaschen', target: 15 },
  { id: 'fleisch', label: 'Fleisch', target: 15 },
  { id: 'fisch', label: 'Fisch', target: 10 },
  { id: 'huelsenfruechte', label: 'Bohnen & Linsen', target: 15 },
  { id: 'salat-kalt', label: 'Salate & Kaltes', target: 10 },
  { id: 'brot-ei-kaese', label: 'Brot, Ei & Käse', target: 10 },
  { id: 'convenience', label: 'Convenience', target: 5 },
]

export const RECIPE_CATEGORY_LABEL = Object.fromEntries(RECIPE_CATEGORIES.map((c) => [c.id, c.label])) as Record<
  RecipeCategory,
  string
>
