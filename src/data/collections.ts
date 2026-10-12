import type { CollectionName } from '../types'

/** Namen der Datensammlungen für Anzeigen (Abgleich, Backup). */
export const COLLECTION_LABEL: Record<CollectionName, string> = {
  foodLogs: 'Essen',
  drinkLogs: 'Getränke',
  supplementLogs: 'Supplements',
  workouts: 'Trainings',
  weights: 'Gewicht',
  arms: 'Armumfang',
  mealPlan: 'Wochenplan',
  pantry: 'Vorrat & Reste',
  shopping: 'Einkaufsliste (alt)',
  products: 'Eigene Produkte',
  days: 'Tagesstatus',
  suggestions: 'Vorschläge',
  schedule: 'Trainingskalender',
  targetWeights: 'Zielgewichte',
  shoppingItems: 'Einkaufsliste',
}
