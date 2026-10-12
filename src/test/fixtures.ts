import { createDefaultSettings } from '../data/defaults'
import type { Settings } from '../types'

/** Feste Testeinstellungen, unabhängig von einer lokalen personal.local.json. */
export function testSettings(): Settings {
  const s = createDefaultSettings()
  s.program.startDate = '2026-10-12'
  s.targets = { kcal: 2200, protein: 120, fat: 70, carbs: 270, fiber: 30, fluidMl: 2000, gainMinG: 100, gainMaxG: 250, bmrEstimate: 1700, maintenanceMin: 2000, maintenanceMax: 2300 }
  s.budget = { min: 15, max: 20, mondayLeftovers: true, co2Needed: false, co2Price: 9.99 }
  s.funDrinks = [
    { id: 'test-a', name: 'Testgetränk A', foodId: 'afri-cola', ml: 500, frequency: 'daily', perWeek: 7, packMl: 1000, packPrice: 1.39, inBudget: true },
    { id: 'test-b', name: 'Testgetränk B', foodId: 'energy', ml: 250, frequency: 'perWeek', perWeek: 3, packMl: 250, packPrice: 0.99, inBudget: true },
  ]
  return s
}
