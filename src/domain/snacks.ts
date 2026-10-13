import { FOOD_MAP } from '../data/foods'
import type { Snack } from '../data/snacks'
import type { NutrientProfile } from '../types'
import { combineProfiles, foodProfile } from './nutrition'

export function snackProfile(snack: Snack): NutrientProfile {
  return combineProfiles(snack.items.map(([id, amount]) => ({ profile: foodProfile(FOOD_MAP[id], amount), ignoreMissing: !!FOOD_MAP[id].negligible })))
}
