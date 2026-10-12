import type { FoodTag, Settings } from '../types'
import { todayISO } from '../lib/date'
import { ESN_DEFAULT_PROTEIN } from './supplements'

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

export const SETTINGS_VERSION = 2

/** Deine Startwerte aus dem Auftrag. In den Einstellungen jederzeit änderbar. */
export function createDefaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    profile: {
      name: '',
      age: 22,
      sex: 'm',
      heightCm: 171,
      startWeightKg: 60.3,
      activity: 'gering, überwiegend sitzend',
      experience: 'kaum Krafttraining',
      goal: 'Möglichst viel Muskelmasse in drei bis vier Monaten aufbauen',
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
      kcal: 2150,
      protein: 120,
      fat: 65,
      carbs: 270,
      fiber: 30,
      fluidMl: 2300,
      gainMinG: 100,
      gainMaxG: 250,
      bmrEstimate: 1567,
      maintenanceMin: 1900,
      maintenanceMax: 2100,
    },
    arms: { weakerSide: null },
    supplements: {
      creatineEnabled: true,
      creatineDoseG: 3,
      creatineReminder: false,
      proteinPowderAvailable: true,
      proteinProductId: ESN_DEFAULT_PROTEIN,
    },
    budget: {
      min: 15,
      max: 20,
      mondayLeftovers: true,
      co2Needed: false,
      co2Price: 9.99,
    },
    funDrinks: [
      { id: 'afri-cola', name: 'Afri-Cola', foodId: 'afri-cola', ml: 500, frequency: 'daily', perWeek: 7, packMl: 1000, packPrice: 1.39, inBudget: true },
      { id: 'energy', name: 'Energy-Drink', foodId: 'energy', ml: 250, frequency: 'perWeek', perWeek: 3, packMl: 250, packPrice: 0.99, inBudget: true },
    ],
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
    spotify: {
      artists: ['Gunna', 'Ty Dolla Sign', 'Kid Cudi', 'Don Toliver', 'Future', 'Young Thug', 'Casper', 'Chapo102', 'Badchieff'],
      savedPlaylists: [],
    },
    mealTimes: { lunch: '11:00', dinner: '19:00', late: '22:00' },
  }
}

/** Fehlende Felder (z. B. nach einem Update) mit Standardwerten auffüllen. */
export function normalizeSettings(input: Partial<Settings> | undefined): Settings {
  const d = createDefaultSettings()
  if (!input) return d
  return {
    ...d,
    ...input,
    version: SETTINGS_VERSION,
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

/**
 * Gespeicherte Einstellungen älterer Versionen anheben.
 * Version 1 → 2: Profil und Ziele auf deine Startwerte aus dem Auftrag setzen (vorher konnten dort
 * neutrale Platzhalter stehen), Kreatin und Proteinpulver aktivieren, leere Getränke-, Budget- und
 * Musikangaben mit deinen Werten füllen.
 */
export function migrateSettings(stored: Partial<Settings> | undefined): { settings: Settings; changed: boolean } {
  if (!stored) return { settings: createDefaultSettings(), changed: true }
  const version = stored.version ?? 1
  if (version >= SETTINGS_VERSION) return { settings: normalizeSettings(stored), changed: false }
  const d = createDefaultSettings()
  const s = normalizeSettings(stored)
  return {
    changed: true,
    settings: {
      ...s,
      profile: { ...d.profile, name: s.profile.name },
      targets: d.targets,
      supplements: { ...s.supplements, creatineEnabled: true, proteinPowderAvailable: true, proteinProductId: s.supplements.proteinProductId ?? ESN_DEFAULT_PROTEIN },
      budget: s.budget.max === 25 ? d.budget : s.budget,
      funDrinks: s.funDrinks.length ? s.funDrinks : d.funDrinks,
      spotify: { ...s.spotify, artists: s.spotify.artists.length ? s.spotify.artists : d.spotify.artists },
    },
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
