import type { MealSlot } from '../types'

export const MEAL_LABEL: Record<MealSlot, string> = {
  fruehstueck: 'Frühstück',
  mittag: 'Mittagessen',
  snack: 'Snack',
  abend: 'Abendessen',
  spaet: 'Später Snack',
}

export const MEAL_ORDER: MealSlot[] = ['fruehstueck', 'mittag', 'snack', 'abend', 'spaet']

export const SIDE_LABEL = { left: 'Links', right: 'Rechts' } as const
