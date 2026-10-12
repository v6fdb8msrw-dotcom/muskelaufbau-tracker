import type { FoodTag, Settings } from '../types'
import { todayISO } from '../lib/date'
import { PERSONAL } from './personal'

export const EXCLUDED_TAG_LABEL: Record<FoodTag, string> = {
  mushroom: 'Pilze',
  cauliflower: 'Blumenkohl',
  brussels: 'Rosenkohl',
  broccoli: 'Brokkoli',
  'spinach-cooked': 'Gekochter Spinat',
  nut: 'Nüsse aller Art (inkl. Pistazien)',
  peanut: 'Erdnüsse',
  shrimp: 'Garnelen und Shrimps',
  mollusc: 'Muscheln und andere Weichtiere',
  kohlrabi: 'Kohlrabi',
  tomato: 'Tomaten, Tomatensoße, Tomatenmark',
  potato: 'Gekochte Kartoffeln als Grundlage',
}

export const DEFAULT_EXCLUDED_TAGS: FoodTag[] = [
  'mushroom',
  'cauliflower',
  'brussels',
  'broccoli',
  'spinach-cooked',
  'nut',
  'peanut',
  'shrimp',
  'mollusc',
  'kohlrabi',
]

export const DEFAULT_AVOID_TAGS: FoodTag[] = ['tomato', 'potato']

/**
 * Standardeinstellungen. Persönliche Startwerte kommen aus personal.local.json (nicht im Repository),
 * sonst gelten neutrale Platzhalter, die du in den Einstellungen anpasst.
 */
export function createDefaultSettings(): Settings {
  const neutral: Settings = {
    version: 1,
    profile: {
      name: '',
      age: 25,
      sex: 'm',
      heightCm: 175,
      startWeightKg: 70,
      activity: '',
      experience: '',
      goal: 'Muskelaufbau',
      confirmed: false,
    },
    program: {
      startDate: todayISO(),
      weeks: 16,
      secondDay: 'mi',
      weekendDay: 'so',
      pulloverSuitable: true,
      extraWeakSet: false,
      dumbbellStepKg: 1,
      equipment: { dumbbells: true, rower: true, treadmill: true, pullupBar: false },
    },
    targets: {
      kcal: 2200,
      protein: 110,
      fat: 70,
      carbs: 270,
      fiber: 30,
      fluidMl: 2000,
      gainMinG: 100,
      gainMaxG: 250,
      bmrEstimate: 1700,
      maintenanceMin: 2000,
      maintenanceMax: 2300,
    },
    arms: { weakerSide: null },
    supplements: {
      creatineEnabled: false,
      creatineDoseG: 3,
      creatineReminder: false,
      proteinPowderAvailable: false,
    },
    budget: {
      min: 15,
      max: 25,
      mondayLeftovers: true,
      co2Needed: false,
      co2Price: 9.99,
    },
    funDrinks: [],
    prices: {},
    basics: {},
    food: {
      excludedTags: [...DEFAULT_EXCLUDED_TAGS],
      avoidTags: [...DEFAULT_AVOID_TAGS],
      acceptedOptional: [],
      exceptions: ['pizza-salami'],
      excludedFoods: [],
    },
    favorites: [],
    spotify: { artists: [], savedPlaylists: [] },
    mealTimes: { lunch: '11:00', dinner: '19:00', late: '22:00' },
  }
  const p = PERSONAL
  if (!p) return neutral
  return {
    ...neutral,
    profile: { ...neutral.profile, ...p.profile },
    targets: { ...neutral.targets, ...p.targets },
    budget: { ...neutral.budget, ...p.budget },
    funDrinks: p.funDrinks ?? neutral.funDrinks,
    spotify: { ...neutral.spotify, artists: p.artists ?? neutral.spotify.artists },
  }
}

/** Fehlende Felder (z. B. nach einem Update) mit Standardwerten auffüllen. */
export function normalizeSettings(input: Partial<Settings> | undefined): Settings {
  const d = createDefaultSettings()
  if (!input) return d
  return {
    ...d,
    ...input,
    version: 1,
    profile: { ...d.profile, ...input.profile },
    program: { ...d.program, ...input.program, equipment: { ...d.program.equipment, ...input.program?.equipment } },
    targets: { ...d.targets, ...input.targets },
    arms: { ...d.arms, ...input.arms },
    supplements: { ...d.supplements, ...input.supplements },
    budget: { ...d.budget, ...input.budget },
    funDrinks: input.funDrinks ?? d.funDrinks,
    prices: input.prices ?? {},
    basics: input.basics ?? {},
    food: { ...d.food, ...input.food },
    favorites: input.favorites ?? [],
    spotify: { ...d.spotify, ...input.spotify },
    mealTimes: { ...d.mealTimes, ...input.mealTimes },
  }
}

export const DRINK_PRESETS: { id: string; foodId: string; label: string; icon: string }[] = [
  { id: 'wasser', foodId: 'wasser', label: 'Wasser', icon: 'droplet' },
  { id: 'sprudel', foodId: 'sprudel', label: 'Sprudel', icon: 'sparkles' },
  { id: 'tee', foodId: 'tee', label: 'Tee', icon: 'leaf' },
  { id: 'kaffee', foodId: 'kaffee', label: 'Kaffee', icon: 'coffee' },
  { id: 'afri-cola', foodId: 'afri-cola', label: 'Afri-Cola', icon: 'cup' },
  { id: 'energy', foodId: 'energy', label: 'Energy', icon: 'zap' },
  { id: 'milch', foodId: 'milch', label: 'Milch', icon: 'milk' },
  { id: 'orangensaft', foodId: 'orangensaft', label: 'O-Saft', icon: 'citrus' },
]

export const QUICK_AMOUNTS = [150, 250, 330, 500, 750]
